# Solid VC PWA

This Prgressive Web Application is a demo for [Verifiable Credentials](https://www.w3.org/TR/vc-data-model/) with [Selective Disclosure](https://www.w3.org/TR/vc-data-model/#dfn-selective-disclosure) to enhance the access control of [Solid](https://solidproject.org).

We have a live demo available [here](https://km.aifb.kit.edu/services/solid-vc-pwa/).
See the [demo website](https://uvdsl.solid.aifb.kit.edu/conf/2022/semantics/demo) for more information.


## Screenshots

![screenshot](./img/preview.png)  


## Gotcha!
- The service worker is disabled in development mode (> npm run serve).
- To test the service worker locally, you have to build the app (> npm run build) and then serve it locally via some webserver. I use my Solid Pod for that.
- Firefox does not support installing PWAs.
- Safari does not support Web Push Notifications. With iOS 16, Apple will finally support Web Push Notifiactions.

## .env
See the [.env.example](./.env.example) for configuring the path of the application to be served from.

## Build and run using Docker
```
docker build -t solid-vc-pwa:latest .
docker run -d -p 8080:80 --name solid-vc-pwa solid-vc-pwa:latest
```

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```
