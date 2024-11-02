export function KintoneRestAPI(body, method, unit) {
    var api;
    if (unit == "single") {
        api = kintone.api(kintone.api.url('/k/v1/record.json', true), method, body);
    } else if (unit == "field") {
        api = kintone.api(kintone.api.url('/k/v1/app/form/fields.json', true), method, body);
    } else if (unit == "view") {
        api = kintone.api(kintone.api.url('/k/v1/app/views.json', true), method, body);
    } else if (unit == "layout") {
        api = kintone.api(kintone.api.url('/k/v1/app/form/layout', true), method, body);
    } else if (unit == "preview") {
        api = kintone.api(kintone.api.url('/k/v1/preview/app/form/fields', true), method, body);
    } else if (unit == "user") {
        api = kintone.api(kintone.api.url('/v1/users.json', true), method, body);
    } else if (unit == "bulk") {
        api = kintone.api(kintone.api.url('/k/v1/bulkRequest.json', true), method, body);
    } else {
        api = kintone.api(kintone.api.url('/k/v1/records.json', true), method, body);
    }
    return api;
}