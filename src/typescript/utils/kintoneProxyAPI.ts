export const kintoneProxyAPI = async <T>({
    pluginId,
    url,
    method,
    headers = {},
    body = {},
}: {
    pluginId: string;
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers: Record<string, string>;
    body: Record<string, any>;
}): Promise<T> => {
    const [responseBody, status, header] = await kintone.plugin.app.proxy(
        pluginId,
        url,
        method as 'POST',
        headers,
        body
    );

    if (status !== 200) {
        throw {
            responseBody,
            status,
            header,
        };
    }

    return JSON.parse(responseBody);
};
