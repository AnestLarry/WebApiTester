import axios, { AxiosResponse, AxiosHeaders } from "axios";

/**
 * Enum representing common HTTP methods used in API requests.
 */
enum HTTPMethod {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    PATCH = "PATCH",
    HEAD = "HEAD",
    DELETE = "DELETE"
}

interface IUnit {
    name: string;
    description: string;
    path: string;
    headers: AxiosHeaders;
    querys: Map<string, string>;
    success_callbacks: Array<(callback: AxiosResponse<any, any>) => any>;
    fail_callbacks: Array<(callback: AxiosResponse<any, any>) => any>;
    error_callback: (callback: AxiosResponse<any, any>) => any;
    addSuccessCallback: (callback: (data: AxiosResponse<any, any>) => any) => void;
    addFailCallback: (callback: (data: AxiosResponse<any, any>) => any) => void;
    addHeader: (key: string, value: string) => void;
    addQuery: (key: string, value: string) => void;
    notify: (value: AxiosResponse<any, any>) => Array<any>;
    fail: (value: AxiosResponse<any, any>) => Array<any>;
}

interface ITestEngine extends IUnit {
    webSites: Array<IWebSite>;
    addWebSites: (webSites: IWebSite[]) => void;
    start: () => void;
}

interface IClient {
    do: (api: IApi) => Promise<AxiosResponse<any, any>>;
}

interface IWebSite extends IUnit {
    modules: Array<IModule>;
    addModules: (modules: IModule[]) => void;
}

interface IModule extends IUnit {
    apis: Array<IApi>;
    addApis: (apis: IApi[]) => void;
}

interface IApi extends IUnit {
    data: any;
    method: HTTPMethod;
    verify: (data: AxiosResponse<any, any>) => boolean;
    clone(): IApi;
}

export { HTTPMethod, IUnit, ITestEngine, IClient, IWebSite, IModule, IApi };