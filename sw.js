// Chrome's currently missing some useful cache methods,
// this polyfill adds them.
importScripts('/js/lib/fetch-polyfill.js');

var staticCacheName = 'converter-v1';
var allCaches = [
    staticCacheName
];
// const cacheName = 'v1::static';

self.addEventListener('install', e => {
    // once the SW is installed, fetch the resources
    // to make this work offline
    e.waitUntil(
        caches.open(staticCacheName).then(cache => {
            return cache.addAll([
                '/mdrizy96.github.io/',
                '/mdrizy96.github.io/index.html',
                '/mdrizy96.github.io/js/index.js',
                '/mdrizy96.github.io/css/style.css',
                '/mdrizy96.github.io/css/responsiveform1.css',
                '/mdrizy96.github.io/css/responsiveform2.css',
                '/mdrizy96.github.io/css/responsiveform3.css',
                'https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.0/normalize.min.css',
                'https://fonts.googleapis.com/css?family=Roboto:400,700'
            ]).then(() => self.skipWaiting());
        })
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    cacheName.startsWith('converter-') && !allCaches.includes(cacheName);
                }).map(cacheName => caches.delete(cacheName))
            )
        })
    );
});


// when the browser fetches a url, either response with
// the cached object or fetch the actual url
self.addEventListener('fetch', e => {
    console.log('[ServiceWorker] Fetch', e.request.url);

    let requestUrl = new URL(e.request.url);

    if (requestUrl.origin === location.origin) {
        if (requestUrl.pathname === '/') {
            e.respondWith(caches.match('/index.html'));
            return;
        }
    }

    // e.respondWidth Responds to the fetch event
    e.respondWith(
        // Check in cache for the request being made
        caches.match(e.request)
            .then(response => {
                // If the request is in the cache
                if (response) {
                    console.log("[ServiceWorker] Found in Cache", e.request.url, response);
                    // Return the cached version
                    return response;
                }

                // If the request is NOT in the cache, fetch and cache

                let requestClone = e.request.clone();
                return fetch(requestClone)
                    .then(response => {

                        if ( !response ) {
                            console.log("[ServiceWorker] No response from fetch ")
                            return response;
                        }

                        let responseClone = response.clone();

                        //  Open the cache
                        caches.open(staticCacheName).then(cache => {

                            // Put the fetched response in the cache
                            cache.put(e.request, responseClone);
                            console.log('[ServiceWorker] New Data Cached', e.request.url);

                            // Return the response
                            return response;

                        }); // end caches.open

                    })
                    .catch(err => {
                        console.log('[ServiceWorker] Error Fetching & Caching New Data', err);
                    });

            }) // end caches.match(e.request)
    ) // end e.respondWith
})


// self.addEventListener('fetch', event => {
//     var requestUrl = new URL(event.request.url);
//
//     if (requestUrl.origin === location.origin) {
//         if (requestUrl.pathname === '/') {
//             event.respondWith(caches.match('/index.html'));
//             return;
//         }
//     }
//
//     event.respondWith(
//         // ensure we check the *right* cache to match against
//         caches.match(event.request).then(res => {
//             return res || fetch(event.request)
//         })
//
//     );
// });
