// we'll version our cache (and learn how to delete caches in
// some other post)
var staticCacheName = 'converter-v1';
var allCaches = [
    staticCacheName
];
// const cacheName = 'v1::static';

self.addEventListener('install', e => {
    // once the SW is installed, go ahead and fetch the resources
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
// the cached object or go ahead and fetch the actual url
self.addEventListener('fetch', event => {
    var requestUrl = new URL(event.request.url);

    if (requestUrl.origin === location.origin) {
        if (requestUrl.pathname === '/') {
            event.respondWith(caches.match('/index.html'));
            return;
        }
    }

    event.respondWith(
        // ensure we check the *right* cache to match against
        caches.match(event.request).then(res => {
            return res || fetch(event.request)
        })

    );
});

// self.addEventListener('message', event => {
//     if (event.data.action === 'skipWaiting') {
//         self.skipWaiting();
//     }
// });
