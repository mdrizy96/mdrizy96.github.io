import Database from './utils/index';

document.addEventListener('DOMContentLoaded', () => {
    const endpoint = 'https://free.currencyconverterapi.com/api/v5/currencies';
    const inputCurrency = document.querySelector('.currency_convert_from');
    const outputCurrency = document.querySelector('.currency_convert_to');
    const convertButton = document.querySelector('#convert_currency');
    const originalCurrencyInput = document.querySelector('input#original_currency',);
    const convertedCurrencyOutput = document.querySelector('input#converted_currency',);


    // option node for select element
    function createOption(currency) {
        if (currency === "undefined") {
            return 'Currency cannot be empty.';
        }

        const optionNode = document.createElement('option');
        optionNode.innerText = currency;

        return optionNode;
    }

    // add currency nodes to select elements
    function addCurrenciesToSelect(currencies) {
        if (currencies.length === 0 || currencies === 'undefined') {
            console.log("Currencies cannot be empty.");
        }

        currencies.map(currency => {
            inputCurrency.appendChild(createOption(currency));
            outputCurrency.appendChild(createOption(currency));
        });
    }

    // Get amount in input field
    function getInput() {
        return document.querySelector('input#amount').value;
    }

    // get currencies list from api
    function fetchListOfCurrencies() {
        fetch(endpoint)
            .then(response => response.json())
            .then(myJson => {
                const currencies = Object.keys(myJson.results).sort();


                Database.addCurrencyArray('Currencies', 'currenciesArray', currencies);
                addCurrenciesToSelect(currencies);

            })
            .catch(err => {
                    console.error(
                        `The following error occurred while getting currencies. ${err}`,
                    )

                    // Get rates when user is offline
                    Database.retrieve('Currencies', 'currenciesArray').then(currencies => {
                        if (typeof currencies === 'undefined') return;
                        addCurrenciesToSelect(currencies);
                    })
                }

            );
    }

    // get conversion rates between currencies
    function fetchCurrencyRate(url, queryString) {
        if (url === 'undefined') {
            return 'URL cannot be empty.';
        }
        const inputAmount = getInput();

        fetch(url)
            .then(response => response.json())
            .then(myJson => {

                const exchangeRate = Object.values(myJson);

                Database.addCurrency('ExchangeRates', queryString, exchangeRate);

                calculateExchangeRate(...exchangeRate, inputAmount);
            })
            .catch(err => {
                    console.error(
                        `The following error occured while getting the conversion rate. ${err}`,
                    );

                    // Get exchange rates when offline
                    Database.retrieve( 'ExchangeRates' , queryString).then(data => {
                        if (typeof data === 'undefined') return;
                        calculateExchangeRate(data, inputAmount);
                    })
                }

            );
    }

    // api url from which to get conversion rates
    function buildAPIUrl(queryString) {

        return `https://free.currencyconverterapi.com/api/v5/convert?q=${queryString}&compact=ultra`;
    }

    // use selected currencies to get exchange rate
    function getExchangeRate() {
        const sourceCurrency = document.querySelector('.currency_convert_from').value;
        const destinationCurrency = document.querySelector('.currency_convert_to').value;
        const currencyQueryString = `${sourceCurrency}_${destinationCurrency}`;

        const url = buildAPIUrl(currencyQueryString);
        fetchCurrencyRate(url, currencyQueryString);
    }

    // calculate exchange rates using amount entered
    function calculateExchangeRate(exchangeRate, input) {
        if (arguments.length !== 2) {
            return 'An input amount and exchange rate must be provided.';
        }

        const convertedCurrency = input * exchangeRate;

        originalCurrencyInput.value = input;
        convertedCurrencyOutput.value = convertedCurrency.toFixed(2);
    }

    // add event listener to the convertButton
    function addEventListeners() {
        convertButton.addEventListener('click', getExchangeRate);
    }

    // add functions to be called to main
    function main() {
        addEventListeners();
        fetchListOfCurrencies();
    }

    main();

})