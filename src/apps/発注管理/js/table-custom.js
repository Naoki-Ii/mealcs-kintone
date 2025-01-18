import { getEnvGlobalConfig } from '../../../typescript/libs/envConfig';
import { KintoneRestAPI } from '../../../common/function';
(function () {
    "use strict";
    const currentEnvGlobalConfig = getEnvGlobalConfig();
    const EventTrigger = [
        "app.record.edit.show",
        "app.record.create.change.start_date",
    ];

    const SaveTrigger = [
        "app.record.edit.submit.success",
        "app.record.create.submit.success",
    ];

    const time_kubun = {
        "b": {
            "label": "朝",
            "value": "b"
        },
        "l": {
            "label": "昼",
            "value": "l"
        },
        "d": {
            "label": "夜",
            "value": "d"
        }
    }

    kintone.events.on("app.record.detail.show", async function (event) {
        kintone.app.record.setFieldShown('発注明細', false);
        const category_response = await KintoneRestAPI({ "app": currentEnvGlobalConfig.APP.KUBUN_MASTER_DB.AppID, "query": "limit 500" }, "GET", "mul");
        let categories = [];
        for (const category of category_response.records) {
            const key = category.key.value;
            const label = category.label.value;
            categories.push({
                "key": key,
                "label": label,
                "priority": category.priority.value
            });
        }
        // priorityでソート
        categories.sort((a, b) => {
            return a.priority - b.priority;
        });

        // space取得 
        const box = document.createElement('div');
        box.id = 'order-detail';
        let element = '<table class="edit_table">';
        element += '<thead>';
        element += '<tr>';
        element += `<th class="date">日付</th>`;
        element += `<th class="kubun">区分</th>`
        element += `<th class="kubun">合計注文数</th>`
        for (const category of categories) {
            element += `<th class="kubun" style="width:45px;">${category.label}</th>`;
        }
        element += `<th class="kubun">備考</th>`;
        element += '</tr>';
        element += '</thead>';
        element += '<tbody>';
        for (const row of event.record.発注明細.value) {
            element += '<tr>';
            element += `<td rowspan="4" class="date">${row.value.日付.value}</td>`;
            element += `</tr>`;
            for (const kubun of Object.keys(time_kubun)) {
                element += '<tr>';
                element += `<td class="label">${time_kubun[kubun].label}</td>`;
                const total = Number(row.value[time_kubun[kubun].value + "_注文数"].value) + Number(row.value[time_kubun[kubun].value + "_検食"].value);
                element += `<td>${total}</td>`;
                for (const category of categories) {
                    let val = row.value[time_kubun[kubun].value + "_" + category.key].value;
                    if (val == 0) {
                        val = "";
                    }
                    element += `<td>${val}</td>`;
                }
                let v = row.value[time_kubun[kubun].value + "_備考"].value;
                // \nを<br>に変換
                v = v.replace(/\n/g, "<br>");
                element += `<td class="note_scope">${v}</td>`;
                element += '</tr>';
            }
        }
        element += '</tbody>';
        element += '</table>';
        box.innerHTML = element;

        kintone.app.record.getSpaceElement('order-detail').appendChild(box);
        return event;
    });

    kintone.events.on(EventTrigger, function (event) {
        kintone.app.record.setFieldShown('発注明細', false);
        kintone.api(kintone.api.url('/k/v1/records.json', true), "GET", { "app": currentEnvGlobalConfig.APP.KUBUN_MASTER_DB.AppID, "query": "limit 500" }).then(function (category_response) {
            console.log(category_response);
            let categories = [];
            for (const category of category_response.records) {
                categories.push({
                    "key": category.key.value,
                    "label": category.label.value,
                    "priority": category.priority.value
                });
            }
            // priorityでソート
            categories.sort((a, b) => {
                return a.priority - b.priority;
            });

            if (event.record.発注明細.value.length == 7 && event.record.発注明細.value[0].value.日付.value == event.record.start_date.value) {
                // 7日分のデータと開始日が一致する場合は何もしない
            } else if (event.record.発注明細.value.length == 7 && event.record.発注明細.value[0].value.日付.value != event.record.start_date.value) {
                // 7日分のデータがあり、開始日が一致しない場合は日付を更新
                let base_date = new Date(event.record.start_date.value);
                for (let i = 0; i < 7; i++) {
                    const d = new Date(base_date).setDate(base_date.getDate() + i);
                    event.record.発注明細.value[i].value.日付.value = new Date(d).toISOString().slice(0, 10);
                }
            } else {
                event.record.発注明細.value = [];
                //  7日分のデータを作成
                let base_date = new Date(event.record.start_date.value);
                for (let i = 0; i < 7; i++) {
                    const d = new Date(base_date).setDate(base_date.getDate() + i);
                    let row = {
                        "日付": {
                            "value": new Date(d).toISOString().slice(0, 10)
                        }
                    };
                    for (const kubun of Object.keys(time_kubun)) {
                        for (const category of categories) {
                            row[time_kubun[kubun].value + "_" + category.key] = {
                                "value": 0
                            }
                        }
                        row[time_kubun[kubun].value + "_備考"] = {
                            "value": ""
                        }
                    }
                    event.record.発注明細.value.push({
                        "value": row
                    });
                }
            }
            console.log(event.record.発注明細.value);
            // space取得 
            const box = document.createElement('div');
            box.id = 'order-detail';
            let element = '<table class="edit_table">';
            element += '<thead>';
            element += '<tr>';
            element += `<th class="date">日付</th>`;
            element += `<th class="kubun">区分</th>`;


            for (const category of categories) {
                element += `<th class="kubun" style="width:45px;">${category.label}</th>`;
            }
            element += `<th class="kubun">備考</th>`;
            element += '</tr>';
            element += '</thead>';
            element += '<tbody>';
            for (const row of event.record.発注明細.value) {
                element += '<tr>';
                element += `<td rowspan="4" class="date">${row.value.日付.value}</td>`;
                element += `</tr>`;
                for (const kubun of Object.keys(time_kubun)) {
                    element += '<tr>';
                    element += `<td class="label">${time_kubun[kubun].label}</td>`;
                    for (const category of categories) {
                        element += `<td class="count_scope save_scope"><input type="number" value="${Number(row.value[time_kubun[kubun].value + "_" + category.key].value)}" data-datekey="${row.value.日付.value}" data-fieldkey="${time_kubun[kubun].value + "_" + category.key}"></td>`;
                    }
                    // 備考欄 textarea
                    let v = row.value[time_kubun[kubun].value + "_備考"].value == undefined ? "" : row.value[time_kubun[kubun].value + "_備考"].value;
                    element += `<td class="note_scope"><textarea data-datekey="${row.value.日付.value}" data-fieldkey="${time_kubun[kubun].value + "_備考"}">${v}</textarea></td>`;
                    element += '</tr>';
                }
            }
            element += '</tbody>';
            element += '</table>';
            box.innerHTML = element;
            $("#order-detail").remove();
            kintone.app.record.getSpaceElement('order-detail').appendChild(box);
            return event;
        });

    });

    kintone.events.on(SaveTrigger, async function (event) {
        const inputs = document.querySelectorAll('.edit_table .save_scope input[type="number"]');
        const textareas = document.querySelectorAll('.edit_table .note_scope textarea');
        let send_info = {
            "table_info": {}
        };
        inputs.forEach(input => {
            const datekey = input.getAttribute('data-datekey');
            const fieldkey = input.getAttribute('data-fieldkey');
            const value = input.value;


            if (!send_info.table_info[datekey]) {
                send_info.table_info[datekey] = {};
            }

            if (!send_info.table_info[datekey][fieldkey]) {
                send_info.table_info[datekey][fieldkey] = {};
            }
            send_info.table_info[datekey][fieldkey] = Number(value);
        });

        textareas.forEach(textarea => {
            const datekey = textarea.getAttribute('data-datekey');
            const fieldkey = textarea.getAttribute('data-fieldkey');
            const value = textarea.value;
            send_info.table_info[datekey][fieldkey] = value;
        });

        let data = [];
        let NumberManagemenetJson = {};
        for (const key in send_info.table_info) {
            let row = {
                "日付": {
                    "value": key
                }
            };
            if (NumberManagemenetJson[key] == undefined) {
                NumberManagemenetJson[key] = {};
            }
            for (const fieldkey in send_info.table_info[key]) {
                row[fieldkey] = {
                    "value": send_info.table_info[key][fieldkey]
                }
                if (NumberManagemenetJson[key][fieldkey] == undefined) {
                    NumberManagemenetJson[key][fieldkey] = {};
                }
                NumberManagemenetJson[key][fieldkey] = {
                    "mode": "able",
                    "value": send_info.table_info[key][fieldkey]
                }
            }
            data.push(
                {
                    "value": row
                }
            );
        }
        const body = {
            "app": kintone.app.getId(),
            "id": event.record.$id.value,
            "record": {
                "発注明細": {
                    "value": data
                }
            }
        };

        const NumberManagementJsonBody = {
            "app": currentEnvGlobalConfig.APP.NUMBER_MANAGEMENT.AppID,
            "record": {
                "company_id": {
                    "value": event.record.company_id.value
                },
                "order_id": {
                    "value": event.record.$id.value
                },
                "data": {
                    "value": JSON.stringify(NumberManagemenetJson, null, 4)
                }
            }
        }

        const BulkRequestBody = {
            "requests": [
                {
                    "method": "POST",
                    "api": "/k/v1/record.json",
                    "payload": NumberManagementJsonBody
                },
                {
                    "method": "PUT",
                    "api": "/k/v1/record.json",
                    "payload": body
                }
            ]
        }

        const response = await KintoneRestAPI(BulkRequestBody, "POST", "bulk");
        console.log(response);
        return event;
    });

    kintone.events.on("app.record.create.submit", function (event) {
        const start_date = event.record.start_date.value;
        const company_id = event.record.company_id.value;
        // start_date が月曜日でない場合
        const date = new Date(start_date);
        const day = date.getDay();
        console.log(date, day);
        if (day != 1) {
            event.error = "開始日は月曜日にしてください";
        }
        return kintone.api(kintone.api.url('/k/v1/records.json', true), "GET", { "app": currentEnvGlobalConfig.APP.ORDER.AppID, "query": `start_date = "${start_date}" and company_id = "${company_id}"` }).then(function (response) {
            if (response.records.length > 0) {
                event.error = "指定した日付の注文は登録されています";
            }
            return event;
        });
    });

    kintone.events.on("app.record.edit.show", function (event) {
        event.record.start_date.disabled = true;
        event.record.company_name.disabled = true;
        return event;
    });

})();