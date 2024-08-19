# Web API Tester

A web API tester with easy use.

## Getting Started

```ts
import { TestEngine, WebSite, Module, Api, HTTPMethod } from "web-api-tester";
var engine = new TestEngine({});
engine.addWebSites([
  new WebSite({
    path: "https://www.bing.com",
    modules: [
      new Module({
        path: "",
        apis: [
          new Api({
            path: "/",
            method: HTTPMethod.GET,
            success_callbacks: [
              (data) => {
                console.log(data.data.toString());
              },
            ],
          }),
        ],
      }),
    ],
  }),
]);
engine.start();
```

## Installation

You can get Node.js from [here](https://nodejs.org/en/).

Then, install the package with the following command:

```bash
npm install https://github.com/AnestLarry/web-api-tester
```

## Contributing

If you would like to contribute to this project, please fork the repository and submit a pull request.

## License

This project is licensed under the [license].
