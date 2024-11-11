import { getEnvGlobalConfig } from '../../../typescript/libs/envConfig';
import { KintoneRestAPI } from '../../../common/function';
import { split, xor } from 'lodash';
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

        const laylout = await KintoneRestAPI({ "app": currentEnvGlobalConfig.APP.SETTING.AppID }, "GET", "field");
        let categories = Object.keys(laylout.properties.kubun.options);
        categories.sort((a, b) => {
            // 数字部分を取り出し、整数として比較する
            const numA = parseInt(a.split('.')[0], 10);
            const numB = parseInt(b.split('.')[0], 10);
            return numA - numB;
        });
        for (var i = 0; i < categories.length; i++) {
            const v = categories[i].split('.')[1];
            categories[i] = v;
        }
        // space取得 
        const box = document.createElement('div');
        box.id = 'order-detail';
        let element = '<table class="edit_table">';
        element += '<thead>';
        element += '<tr>';
        element += `<th class="date">日付</th>`;
        element += `<th class="kubun">区分</th>`

        for (const category of categories) {
            // xxx(xx)の場合 (の前に<br>を入れる
            if (category.indexOf("(") != -1) {
                const index = category.indexOf("(");
                const category1 = category.slice(0, index);
                const category2 = category.slice(index);
                element += `<th class="kubun" style="width:45px;">${category1}<br>${category2}</th>`;
            } else {
                element += `<th class="kubun" style="width:45px;">${category}</th>`;
            }
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
                    // (, )は_に変換
                    let key = category.replace("(", "_");
                    key = key.replace(")", "_");
                    element += `<td>${row.value[time_kubun[kubun].value + "_" + key].value}</td>`;
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
        kintone.api(kintone.api.url('/k/v1/app/form/fields.json', true), "GET", { "app": currentEnvGlobalConfig.APP.SETTING.AppID }).then(function (laylout) {
            let categories = Object.keys(laylout.properties.kubun.options);
            categories.sort((a, b) => {
                // 数字部分を取り出し、整数として比較する
                const numA = parseInt(a.split('.')[0], 10);
                const numB = parseInt(b.split('.')[0], 10);
                return numA - numB;
            });
            for (var i = 0; i < categories.length; i++) {
                const v = categories[i].split('.')[1];
                categories[i] = v;
            }
            if (event.record.発注明細.value.length != 7) {
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
                            let key = category.replace("(", "_");
                            key = key.replace(")", "_");
                            row[time_kubun[kubun].value + "_" + key] = {
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
                // xxx(xx)の場合 (の前に<br>を入れる
                if (category.indexOf("(") != -1) {
                    const index = category.indexOf("(");
                    const category1 = category.slice(0, index);
                    const category2 = category.slice(index);
                    element += `<th class="kubun" style="width:45px;">${category1}<br>${category2}</th>`;
                } else {
                    element += `<th class="kubun" style="width:45px;">${category}</th>`;
                }
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
                        // (, )は_に変換
                        let key = category.replace("(", "_");
                        key = key.replace(")", "_");
                        element += `<td class="count_scope save_scope"><input type="number" value="${Number(row.value[time_kubun[kubun].value + "_" + key].value)}" data-datekey="${row.value.日付.value}" data-fieldkey="${time_kubun[kubun].value + "_" + key}"></td>`;
                    }
                    // 備考欄 textarea
                    element += `<td class="note_scope"><textarea data-datekey="${row.value.日付.value}" data-fieldkey="${time_kubun[kubun].value + "_備考"}">${row.value[time_kubun[kubun].value + "_備考"].value}</textarea></td>`;
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

})();