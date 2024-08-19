import axios, { AxiosHeaders, AxiosResponse } from "axios";
import { HTTPMethod, ITestEngine, IWebSite, IClient, IApi, IModule } from "./IUnit";

class HTTPClient implements IClient {
    do = (api: IApi) => {
        return axios.request({
            method: api.method,
            url: api.path,
            headers: api.headers,
            params: api.querys,
            data: api.data
        });
    };
}

/**
 * TestEngine class implements the ITestEngine interface.
 * It is responsible for managing test configurations and executing tests.
 */
class TestEngine implements ITestEngine {
    /**
     * Constructor for the Unit class.
     * @param path - The API endpoint path.
     * @param headers - Optional headers to be sent with the request.
     * @param querys - Optional query parameters to be sent with the request.
     * @param success_callbacks - Optional array of callbacks to be executed on successful response.
     * @param fail_callbacks - Optional array of callbacks to be executed on failed response.
     * @param error_callback - Optional callback to be executed on error.
     * @param webSites - Optional array of web sites related to the unit.
     * @param name - Optional name for the unit. Default is "TestEngine".
     * @param description - Optional description for the unit. Default is "TestEngine".
     */
    constructor({
        headers, querys, success_callbacks, fail_callbacks, error_callback, webSites, name, description
    }: {
        headers?: AxiosHeaders,
        querys?: Map<string, string>,
        success_callbacks?: Array<(callback: AxiosResponse<any, any>) => void>,
        fail_callbacks?: Array<(callback: AxiosResponse<any, any>) => void>,
        error_callback?: (callback: AxiosResponse<any, any>) => any,
        webSites?: Array<IWebSite>,
        name?: string,
        description?: string,
    }
    ) {
        this.path = "";
        this.headers = headers || new AxiosHeaders();
        this.querys = querys || new Map<string, string>();
        this.success_callbacks = success_callbacks || [];
        this.fail_callbacks = fail_callbacks || [];
        this.error_callback = error_callback || ((_: AxiosResponse<any, any>) => { });
        this.webSites = webSites || [];
        this.name = name || "TestEngine";
        this.description = description || "TestEngine";
    }
    name: string; // Name of the test engine
    description: string; // Description of the test engine
    webSites: Array<IWebSite>; // List of websites to be tested
    path: string; // The path to the API endpoint
    headers: AxiosHeaders; // Headers to be sent with the request
    querys: Map<string, string>; // Query parameters to be sent with the request
    success_callbacks: Array<(callback: AxiosResponse<any, any>) => void>; // Callbacks to be executed on successful response
    fail_callbacks: Array<(callback: AxiosResponse<any, any>) => void>; // Callbacks to be executed on failed response
    error_callback: (callback: AxiosResponse<any, any>) => any;


    addSuccessCallback = (callback: (data: AxiosResponse<any, any>) => any) => {
        this.success_callbacks.push(callback);
    };
    addFailCallback = (callback: (data: AxiosResponse<any, any>) => any) => {
        this.fail_callbacks.push(callback);
    }

    /**
     * Adds a header to the request.
     * @param key - The header key.
     * @param value - The header value.
     */
    addHeader = (key: string, value: string) => {
        this.headers.set(key, value);
    };

    /**
     * Adds a query parameter to the request.
     * @param key - The query parameter key.
     * @param value - The query parameter value.
     */
    addQuery = (key: string, value: string) => {
        this.querys.set(key, value);
    };

    /**
     * Notifies all success callbacks with the response.
     * @param value - The Axios response object.
     * @returns An array of results from the callbacks.
     */
    notify = (value: AxiosResponse<any, any>) => {
        var result: Array<any> = [];
        this.success_callbacks.forEach((callback) => {
            result.push(callback(value));
        });
        return result;
    };

    /**
     * Notifies all fail callbacks with the response.
     * @param value - The Axios response object.
     * @returns An array of results from the callbacks.
     */
    fail = (value: AxiosResponse<any, any>) => {
        var result: Array<any> = [];
        this.fail_callbacks.forEach((callback) => {
            result.push(callback(value));
        });
        return result;
    };

    /**
     * Adds an array of websites to the existing list of websites.
     * 
     * @param webSites - An array of website objects to be added.
     */
    addWebSites = (webSites: IWebSite[]) => {
        webSites.forEach((webSite) => {
            this.webSites.push(webSite);
        });
    };

    // Start method initiates the testing process for all APIs across websites and modules.
    /**
     * Iterates through each website, module, and API to execute tests.
     * Clones the API configuration, merges headers, sets query parameters,
     * and sends requests using HTTPClient. Handles both successful and failed responses.
     */
    start = () => {
        // Initialize HTTPClient instance
        let client = new HTTPClient();

        // Iterate over each website
        this.webSites.forEach((webSite) => {
            // Iterate over each module within the website
            webSite.modules.forEach((module) => {
                // Iterate over each API within the module
                module.apis.forEach((api) => {
                    // Clone the API configuration to avoid mutating original
                    let capi = api.clone();

                    // Initialize headers and parameters collections
                    let header = new AxiosHeaders();
                    let params = new Map<string, string>();

                    // Concatenate headers from all levels: this, website, module, and API
                    [this, webSite, module, api].forEach((level) => {
                        header.concat(level.headers);
                    });
                    capi.headers = header;

                    // Set the path by joining the path properties of each level
                    capi.path = [this, webSite, module, api]
                        .map(level => level.path)
                        .join("");

                    // Merge query parameters from all levels into a single map
                    [this, webSite, module, api].forEach((level) => {
                        level.querys.forEach((value, key) => {
                            params.set(key, value);
                        });
                    });
                    capi.querys = params;

                    // Send request using HTTPClient and handle response or error
                    client.do(capi).then((response) => {
                        // If API verification passes, notify all levels
                        if (api.verify(response)) {
                            api.notify(response);
                            module.notify(response);
                            webSite.notify(response);
                            this.notify(response);
                        } else {
                            // If verification fails, fail all levels
                            api.fail(response);
                            module.fail(response);
                            webSite.fail(response);
                            this.fail(response);
                        }
                    }).catch((error) => {
                        // Handle errors by failing all levels
                        api.error_callback(error);
                        module.error_callback(error);
                        webSite.error_callback(error);
                        this.error_callback(error);
                    });
                });
            });
        });
    }
}

/**
 * Represents a website with its properties and methods.
 * This class implements the IWebSite interface.
 */
class WebSite implements IWebSite {
    /**
     * Represents a unit for API testing.
     * @param path - The endpoint path for the API request.
     * @param headers - Optional headers to be sent with the request.
     * @param querys - Optional query parameters to be sent with the request.
     * @param success_callbacks - Optional array of callbacks to be executed on successful response.
     * @param fail_callbacks - Optional array of callbacks to be executed on failed response.
     * @param moudules - Optional array of modules related to this unit.
     * @param name - Optional name for the unit.
     * @param description - Optional description for the unit.
     */
    constructor({
        path, headers, querys, success_callbacks, fail_callbacks, error_callback, modules, name, description
    }: {
        path: string,
        headers?: AxiosHeaders,
        querys?: Map<string, string>,
        success_callbacks?: Array<(callback: AxiosResponse<any, any>) => any>,
        fail_callbacks?: Array<(callback: AxiosResponse<any, any>) => any>,
        error_callback?: (callback: AxiosResponse<any, any>) => any,
        modules?: IModule[],
        name?: string,
        description?: string
    }
    ) {
        this.path = path;
        this.headers = headers || new AxiosHeaders();
        this.querys = querys || new Map<string, string>();
        this.success_callbacks = success_callbacks || [];
        this.fail_callbacks = fail_callbacks || [];
        this.error_callback = error_callback || ((_: AxiosResponse<any, any>) => { });
        this.modules = modules || [];
        this.name = name || "";
        this.description = description || "";
    }
    modules: IModule[];
    name: string;
    description: string;
    path: string;
    headers: AxiosHeaders;
    querys: Map<string, string>;
    success_callbacks: ((callback: AxiosResponse<any, any>) => any)[];
    fail_callbacks: ((callback: AxiosResponse<any, any>) => any)[];
    error_callback: (callback: AxiosResponse<any, any>) => any;


    /**
     * Adds an array of modules to the existing list of modules.
     * 
     * @param modules - An array of IModule objects to be added.
     */
    addModules = (modules: IModule[]) => {
        modules.forEach((module) => {
            this.modules.push(module);
        });
    }

    // Adds a success callback function
    /**
     * Adds a success callback function that will be executed upon successful API response.
     * @param callback The callback function to add.
     */
    addSuccessCallback(callback: (data: AxiosResponse<any, any>) => any): void {
        this.success_callbacks.push(callback);
    }

    // Adds a fail callback function
    /**
     * Adds a fail callback function that will be executed upon failed API response.
     * @param callback The callback function to add.
     */
    addFailCallback(callback: (data: AxiosResponse<any, any>) => any): void {
        this.fail_callbacks.push(callback);
    }

    // Adds a header to the request
    /**
     * Adds a header to the request.
     * @param key The header key.
     * @param value The header value.
     */
    addHeader(key: string, value: string): void {
        this.headers.set(key, value);
    }

    // Adds a query parameter to the request
    /**
     * Adds a query parameter to the request.
     * @param key The query parameter key.
     * @param value The query parameter value.
     */
    addQuery(key: string, value: string): void {
        this.querys.set(key, value);
    }

    // Notifies all success callbacks
    /**
     * Executes all success callback functions with the provided response data.
     * @param value The AxiosResponse object containing the response data.
     * @returns An array of results from the executed callbacks.
     */
    notify(value: AxiosResponse<any, any>): Array<any> {
        let results: Array<any> = [];
        this.success_callbacks.forEach((callback) => {
            results.push(callback(value));
        });
        return results;
    }

    // Executes all fail callbacks
    /**
     * Executes all fail callback functions with the provided response data.
     * @param value The AxiosResponse object containing the response data.
     * @returns An array of results from the executed callbacks.
     */
    fail(value: AxiosResponse<any, any>): Array<any> {
        let results: Array<any> = [];
        this.fail_callbacks.forEach((callback) => {
            results.push(callback(value));
        });
        return results;
    }

}

/**
 * Represents a module that implements the IModule interface.
 * This class serves as a blueprint for creating module instances.
 */
class Module implements IModule {
    // Constructor for the Unit class.
    // @param path - The base URL path for the API calls.
    // @param headers - Optional headers to be sent with each request.
    // @param querys - Optional query parameters to be sent with each request.
    // @param success_callbacks - Optional array of callbacks to be executed on successful API response.
    // @param fail_callbacks - Optional array of callbacks to be executed on failed API response.
    // @param apis - Optional array of API definitions.
    // @param name - Optional name for the unit.
    // @param description - Optional description for the unit.
    constructor({
        path, headers, querys, success_callbacks, fail_callbacks, error_callback, apis, name, description
    }: {
        path: string,
        headers?: AxiosHeaders,
        querys?: Map<string, string>,
        success_callbacks?: [(callback: AxiosResponse<any, any>) => any],
        fail_callbacks?: [(callback: AxiosResponse<any, any>) => any],
        error_callback?: (callback: AxiosResponse<any, any>) => any,
        apis?: IApi[],
        name?: string,
        description?: string
    }) {
        this.path = path;
        this.headers = headers || new AxiosHeaders();
        this.querys = querys || new Map<string, string>();
        this.success_callbacks = success_callbacks || [];
        this.fail_callbacks = fail_callbacks || [];
        this.error_callback = error_callback || ((_: AxiosResponse<any, any>) => { });
        this.apis = apis || [];
        this.name = name || "";
        this.description = description || "";
    }

    apis: IApi[];
    name: string;
    description: string;
    path: string;
    headers: AxiosHeaders;
    querys: Map<string, string>;
    success_callbacks: ((callback: AxiosResponse<any, any>) => any)[];
    fail_callbacks: ((callback: AxiosResponse<any, any>) => any)[];
    error_callback: (callback: AxiosResponse<any, any>) => any;

    /**
     * Adds an array of APIs to the module.
     * @param apis Array of IApi objects to add.
     */
    addApis = (apis: IApi[]) => {
        apis.forEach((api) => {
            this.apis.push(api);
        });
    };
    /**
     * Adds a success callback function to be executed on successful API responses.
     * @param callback Function to execute on success.
     */
    addSuccessCallback = (callback: (data: AxiosResponse<any, any>) => any) => {
        this.success_callbacks.push(callback);
    };

    /**
     * Adds a fail callback function to be executed on failed API responses.
     * @param callback Function to execute on failure.
     */
    addFailCallback = (callback: (data: AxiosResponse<any, any>) => any) => {
        this.fail_callbacks.push(callback);
    };

    /**
     * Adds a header to the request headers.
     * @param key Header key.
     * @param value Header value.
     */
    addHeader = (key: string, value: string) => {
        this.headers.set(key, value);
    };

    /**
     * Adds a query parameter to the request.
     * @param key Query parameter key.
     * @param value Query parameter value.
     */
    addQuery = (key: string, value: string) => {
        this.querys.set(key, value);
    };

    /**
     * Notifies all success callbacks with the response data.
     * @param value AxiosResponse object containing the response data.
     * @returns Array of results from the callbacks.
     */
    notify = (value: AxiosResponse<any, any>) => {
        let results: Array<any> = [];
        this.success_callbacks.forEach((callback) => {
            results.push(callback(value));
        });
        return results;
    };

    /**
     * Executes all fail callbacks with the response data.
     * @param value AxiosResponse object containing the response data.
     * @returns Array of results from the callbacks.
     */
    fail = (value: AxiosResponse<any, any>) => {
        let results: Array<any> = [];
        this.fail_callbacks.forEach((callback) => {
            results.push(callback(value));
        });
        return results;
    };
}

/**
 * Api class implements the IApi interface.
 * This class is responsible for handling API related operations.
 */
class Api implements IApi {
    /**
     * Represents a unit test configuration for an API endpoint.
     * @param path - The endpoint URL path.
     * @param method - The HTTP method to use (e.g., GET, POST).
     * @param headers - Optional headers to include in the request.
     * @param querys - Optional query parameters to include in the request.
     * @param success_callbacks - Optional array of callbacks to execute on successful response.
     * @param fail_callbacks - Optional array of callbacks to execute on failed response.
     * @param verify - Optional function to verify the response.
     * @param data - Optional data to send in the request body.
     * @param name - Optional name for the test unit.
     * @param description - Optional description for the test unit.
     */
    constructor({
        path, method, headers, querys, success_callbacks, fail_callbacks, error_callback, verify, data, name, description
    }: {
        path: string,
        method: HTTPMethod,
        headers?: AxiosHeaders,
        querys?: Map<string, string>,
        success_callbacks?: Array<(callback: AxiosResponse<any, any>) => any>,
        fail_callbacks?: Array<(callback: AxiosResponse<any, any>) => any>,
        error_callback?: (callback: AxiosResponse<any, any>) => any,
        verify?: (callback: AxiosResponse<any, any>) => boolean,
        data?: any,
        name?: string,
        description?: string
    }) {
        this.path = path;
        this.method = method;
        this.headers = headers || new AxiosHeaders();
        this.querys = querys || new Map<string, string>();
        this.success_callbacks = success_callbacks || [];
        this.fail_callbacks = fail_callbacks || [];
        this.error_callback = error_callback || ((_: AxiosResponse<any, any>) => { });
        this.verify = verify || ((r: AxiosResponse<any, any>) => r.status === 200);
        this.data = data || {};
        this.name = name || "";
        this.description = description || "";
    }

    data: any;
    method: HTTPMethod;
    verify: (data: AxiosResponse<any, any>) => boolean;

    name: string;
    description: string;
    path: string;
    headers: AxiosHeaders;
    querys: Map<string, string>;
    success_callbacks: Array<(callback: AxiosResponse<any, any>) => any>;
    fail_callbacks: Array<(callback: AxiosResponse<any, any>) => any>;
    error_callback: (callback: AxiosResponse<any, any>) => any;

    /**
     * Adds a success callback function that will be called when an API request succeeds.
     * @param callback - The callback function to call with the AxiosResponse data.
     */
    addSuccessCallback = (callback: (data: AxiosResponse<any, any>) => any) => {
        this.success_callbacks.push(callback);
    }

    /**
     * Adds a fail callback function that will be called when an API request fails.
     * @param callback - The callback function to call with the AxiosResponse data.
     */
    addFailCallback = (callback: (data: AxiosResponse<any, any>) => any) => {
        this.fail_callbacks.push(callback);
    }

    /**
     * Adds a header to the API request.
     * @param key - The header key.
     * @param value - The header value.
     */
    addHeader = (key: string, value: string) => {
        this.headers.set(key, value);
    }

    /**
     * Adds a query parameter to the API request.
     * @param key - The query parameter key.
     * @param value - The query parameter value.
     */
    addQuery = (key: string, value: string) => {
        this.querys.set(key, value);
    }

    /**
     * Notifies all success callbacks with the response data.
     * @param value - The AxiosResponse data.
     * @returns An array of results from the callbacks.
     */
    notify = (value: AxiosResponse<any, any>) => {
        var results: Array<any> = [];
        this.success_callbacks.forEach((callback) => {
            results.push(callback(value));
        });
        return results;
    }

    /**
     * Notifies all fail callbacks with the response data.
     * @param value - The AxiosResponse data.
     * @returns An array of results from the callbacks.
     */
    fail = (value: AxiosResponse<any, any>) => {
        var results: Array<any> = [];
        this.fail_callbacks.forEach((callback) => {
            results.push(callback(value));
        });
        return results;
    }

    /**
     * Creates a deep clone of the current object.
     * @returns A new instance of the object with the same properties.
     */
    clone = () => {
        var cloneObj = new Api({
            path: this.path,
            method: this.method,
            headers: this.headers,
            querys: this.querys,
            success_callbacks: this.success_callbacks,
            fail_callbacks: this.fail_callbacks,
            error_callback: this.error_callback,
            verify: this.verify,
            data: this.data,
            name: this.name,
            description: this.description
        });
        return cloneObj;
    }
}

export { TestEngine, Api, Module, WebSite, HTTPClient, HTTPMethod };