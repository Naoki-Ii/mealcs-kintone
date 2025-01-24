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

export function formatDate(date) {
    var format_str = "";
    var y = date.getFullYear();
    var M = ('0' + (date.getMonth() + 1)).slice(-2);
    var d = ('0' + date.getDate()).slice(-2);
    var h = ('0' + date.getHours()).slice(-2);
    var m = ('0' + date.getMinutes()).slice(-2);
    format_str = y + "-" + M + "-" + d + " " + h + ":" + m;
    return format_str;
};

export function formatDate2(date, format) {
    if (date == "Invalid Date") {
        return "";
    }
    const y = date.getFullYear();
    const m = ("00" + (date.getMonth() + 1)).slice(-2);
    const d = ("00" + date.getDate()).slice(-2);
    format = format.replace(/yyyy/g, y);
    format = format.replace(/MM/g, m);
    format = format.replace(/dd/g, d);
    return format;
}

export function getCSV(data, name) {
    var bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    var blob = new Blob([bom, data], { "type": "text/csv" });
    var url = (window.URL || window.webkitURL).createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
}

export function formatDateTime(date, format) {
    if (!(date instanceof Date) || isNaN(date)) {
        return date;
    }
    const y = date.getFullYear();
    const m = ("00" + (date.getMonth() + 1)).slice(-2);
    const d = ("00" + date.getDate()).slice(-2);
    const h = ("00" + date.getHours()).slice(-2);
    const i = ("00" + date.getMinutes()).slice(-2);
    const s = ("00" + date.getSeconds()).slice(-2);
    format = format.replace(/yyyy/g, y);
    format = format.replace(/MM/g, m);
    format = format.replace(/dd/g, d);
    format = format.replace(/HH/g, h);
    format = format.replace(/mm/g, i);
    format = format.replace(/ss/g, s);
    return format;
}