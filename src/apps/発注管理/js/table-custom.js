import { getEnvGlobalConfig } from '../../../typescript/libs/envConfig';
import { formatDate2, KintoneRestAPI, formatDateTime } from '../../../common/function';
(function () {
    "use strict";
    const currentEnvGlobalConfig = getEnvGlobalConfig();
    const EventTrigger = [
        "app.record.edit.show",
        "app.record.create.show",
        "app.record.create.change.start_date",
        "app.record.create.change.company_name",
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
            "label": "夕",
            "value": "d"
        }
    }

    kintone.events.on("app.record.detail.show", async function (event) {
        const start_date = event.record.start_date.value;
        const SearchDate1 = new Date(start_date).setDate(new Date(start_date).getDate() - 7);
        const SearchDateString1 = formatDate2(new Date(SearchDate1), "yyyy-MM-dd");
        const SearchDate2 = new Date(start_date).setDate(new Date(start_date).getDate() + 7);
        const SearchDateString2 = formatDate2(new Date(SearchDate2), "yyyy-MM-dd");
        const category_request = KintoneRestAPI({ "app": currentEnvGlobalConfig.APP.KUBUN_MASTER_DB.AppID, "query": "limit 500" }, "GET", "mul");
        const history_request = KintoneRestAPI({ "app": currentEnvGlobalConfig.APP.HISTORY_MANAGEMENT.AppID, "query": `order_id = ${event.record.$id.value} and company_id = ${event.record.company_id.value} order by レコード番号 asc limit 500` }, "GET", "mul");
        const last_order_request = KintoneRestAPI({ "app": currentEnvGlobalConfig.APP.ORDER.AppID, "query": `company_id = ${event.record.company_id.value} and start_date = "${SearchDateString1}" limit 1`, "fields": ["$id"] }, "GET", "mul");
        const next_order_request = KintoneRestAPI({ "app": currentEnvGlobalConfig.APP.ORDER.AppID, "query": `company_id = ${event.record.company_id.value} and start_date = "${SearchDateString2}" limit 1`, "fields": ["$id"] }, "GET", "mul");
        const response = await Promise.all([category_request, history_request, last_order_request, next_order_request]);
        const category_response = response[0];
        const history_response = response[1];
        const last_order_response = response[2];
        const next_order_response = response[3];
        let categories = [];
        const info_icon = "https://order-mealcs.com/img/info_icon.png";
        const history_data_json = [];
        for (var n = 0; n < history_response.records.length; n++) {
            try {
                const record = history_response.records[n];
                const data = JSON.parse(record.data.value);
                const change_date = formatDateTime(new Date(record.作成日時.value), "MM/dd HH:mm");
                history_data_json[n] = {
                    "date": change_date,
                    "data": {}
                }
                for (const row of data) {
                    const key_date = row.value.日付.value;
                    delete row.value.日付;
                    history_data_json[n]["data"][key_date] = row.value;
                }
            } catch (error) {
                console.log(error);
                continue;
            }
        }

        console.log("history_data_json", history_data_json);

        let hisotry_diff_info = {
            "0": history_data_json[0]
        };
        let last_history = history_data_json[0];
        for (var p = 1; p < history_data_json.length; p++) {
            const history_list = history_data_json[p];
            // console.log("last_history", last_history);
            Object.keys(history_list.data).forEach(date_key => {
                Object.keys(history_list.data[date_key]).forEach(field_key => {
                    if (last_history.data[date_key] == undefined) {
                        return;
                    }
                    if (last_history.data[date_key][field_key] == undefined) {
                        return;
                    }
                    if (history_list.data[date_key][field_key]["value"] != last_history.data[date_key][field_key]["value"]) {
                        if (hisotry_diff_info[p] == undefined) {
                            hisotry_diff_info[p] = {
                                "date": history_list.date,
                                "data": {}
                            };
                        }
                        // 差分がある場合
                        if (hisotry_diff_info[p]["data"][date_key] == undefined) {
                            hisotry_diff_info[p]["data"][date_key] = {}
                        }
                        if (hisotry_diff_info[p]["data"][date_key][field_key] == undefined) {
                            hisotry_diff_info[p]["data"][date_key][field_key] = {}
                        }
                        Object.assign(hisotry_diff_info[p]["data"][date_key][field_key], history_list.data[date_key][field_key]);
                    }
                });
            });
            last_history = history_list;
        }

        console.log("hisotry_diff_info", hisotry_diff_info);

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
        let element = '<table class="edit_table view_mode">';
        element += '<thead>';
        element += '<tr>';
        element += `<th class="date">日付</th>`;
        element += `<th class="kubun" id="category_master">区分</th>`
        element += `<th class="kubun" id="total_num">合計注文数</th>`
        for (const category of categories) {
            element += `<th class="kubun" style="width:45px;">${category.label}</th>`;
        }
        element += `<th class="kubun">備考</th>`;
        element += '</tr>';
        element += '</thead>';
        element += '<tbody>';
        let data = JSON.parse(event.record.body.value);
        for (const row of data) {
            element += '<tr>';
            element += `<td rowspan="4" class="date">${row.value.日付.value}</td>`;
            element += `</tr>`;
            for (const kubun of Object.keys(time_kubun)) {
                element += '<tr>';
                element += `<td class="label">${time_kubun[kubun].label}</td>`;
                const total = Number(row.value[time_kubun[kubun].value + "_注文数"].value) + Number(row.value[time_kubun[kubun].value + "_検食"].value);
                element += `<td>${total}</td>`;
                for (const category of categories) {
                    if (row.value[time_kubun[kubun].value + "_" + category.key] == undefined) {
                        // 初期値0として登録
                        row.value[time_kubun[kubun].value + "_" + category.key] = {
                            "value": 0
                        }
                    }
                    let val = row.value[time_kubun[kubun].value + "_" + category.key].value;

                    // 履歴表示機能
                    let history_info_element = "<div class='history_info_box'>";
                    let display_count = 0;
                    for (const key in hisotry_diff_info) {
                        if (hisotry_diff_info[key]["data"][row.value.日付.value] != undefined) {
                            if (hisotry_diff_info[key]["data"][row.value.日付.value][time_kubun[kubun].value + "_" + category.key] != undefined) {
                                const history_date = hisotry_diff_info[key]["date"];
                                const history_data = hisotry_diff_info[key]["data"][row.value.日付.value][time_kubun[kubun].value + "_" + category.key]["value"];
                                history_info_element += `<div class="balloon" data-date="${history_date}" data-field="${time_kubun[kubun].value + "_" + category.key}">${history_date} : <span class="strong">${history_data}</span></div>`;
                                display_count++;
                            }
                        }
                    }
                    history_info_element += "</div>";
                    if (val == 0) {
                        val = "";
                    }
                    if (display_count > 1) {
                        element += `<td>${val}<img src="${info_icon}" alt="info_icon" width="15px" class="info_icon">${history_info_element}</td>`;
                    } else {
                        element += `<td>${val}</td>`;
                    }
                }
                let v = row.value[time_kubun[kubun].value + "_備考"].value == null ? "" : row.value[time_kubun[kubun].value + "_備考"].value;
                // \nを<br>に変換
                v = v.replace(/\n/g, "<br>");
                element += `<td class="note_scope">${v}</td>`;
                element += '</tr>';
            }
        }
        element += '</tbody>';
        element += '</table>';
        box.innerHTML = element;
        console.log("data", data);

        kintone.app.record.getSpaceElement('order-detail').appendChild(box);

        const last_btn = document.createElement('button');
        last_btn.innerText = "先週";
        last_btn.className = "last_order";

        last_btn.onclick = async function () {
            if (last_order_response.records.length > 0) {
                const last_order_id = last_order_response.records[0].$id.value;
                const url = `https://${currentEnvGlobalConfig.KINTONE_DOMAIN}.cybozu.com/k/${currentEnvGlobalConfig.APP.ORDER.AppID}/show#record=${last_order_id}`;
                window.open(url, '_self');
            } else {
                alert("先週の発注がありません");
            }
        }

        const next_btn = document.createElement('button');
        next_btn.innerText = "来週";
        next_btn.className = "next_order";
        next_btn.onclick = async function () {
            if (next_order_response.records.length > 0) {
                const next_order_id = next_order_response.records[0].$id.value;
                const url = `https://${currentEnvGlobalConfig.KINTONE_DOMAIN}.cybozu.com/k/${currentEnvGlobalConfig.APP.ORDER.AppID}/show#record=${next_order_id}`;
                window.open(url, '_self');
            } else {
                alert("来週の発注がありません");
            }
        }

        if ($(".gaia-argoui-app-toolbar-statusmenu .last_order").length > 0) {
            $(".gaia-argoui-app-toolbar-statusmenu .last_order").remove();
        }
        if ($(".gaia-argoui-app-toolbar-statusmenu .next_order").length > 0) {
            $(".gaia-argoui-app-toolbar-statusmenu .next_order").remove();
        }
        $(".gaia-argoui-app-toolbar-statusmenu").append(last_btn);
        $(".gaia-argoui-app-toolbar-statusmenu").append(next_btn);

        $('.history_info_box').each(function () {
            const balloons = $(this).children().get().reverse();
            $(this).append(balloons);
        });

        $('.info_icon').hover(
            function () {
                $(this).siblings('.history_info_box').css('display', 'block');
            },
            function () {
                $(this).siblings('.history_info_box').css('display', 'none');
            }
        );
        return event;
    });

    kintone.events.on(EventTrigger, function (event) {
        const company_name = event.record.company_name.value;
        const start_date = event.record.start_date.value;
        const company_id = event.record.company_id.value;
        if (company_name == "" || company_name == undefined || start_date == "" || start_date == undefined || company_id == "" || company_id == undefined) {
            return event;
        }
        kintone.api(kintone.api.url('/k/v1/record.json', true), "GET", { "app": currentEnvGlobalConfig.APP.SETTING.AppID, "id": company_id }).then(function (company_response) {
            kintone.api(kintone.api.url('/k/v1/records.json', true), "GET", { "app": currentEnvGlobalConfig.APP.KUBUN_MASTER_DB.AppID, "query": "limit 500" }).then(function (category_response) {
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
                let data = [];
                if (event.record.body.value != undefined && event.record.body.value != "") {
                    data = JSON.parse(event.record.body.value);
                }
                if (data.length == 7 && data[0].value.日付.value == event.record.start_date.value) {
                    // 7日分のデータと開始日が一致する場合は何もしない
                } else if (data.length == 7 && data[0].value.日付.value != event.record.start_date.value) {
                    // 7日分のデータがあり、開始日が一致しない場合は日付を更新
                    let base_date = new Date(event.record.start_date.value);
                    for (let i = 0; i < 7; i++) {
                        const d = new Date(base_date).setDate(base_date.getDate() + i);
                        data[i].value.日付.value = new Date(d).toISOString().slice(0, 10);
                    }
                } else {
                    data = [];
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
                                let number = 0;
                                if (category.key == "検食" && company_response.record.検食数.value > 0) {
                                    number = company_response.record.検食数.value;
                                }
                                row[time_kubun[kubun].value + "_" + category.key] = {
                                    "value": number
                                }
                            }
                            row[time_kubun[kubun].value + "_備考"] = {
                                "value": ""
                            }
                        }
                        data.push({
                            "value": row
                        });
                    }
                }
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
                for (const row of data) {
                    element += '<tr>';
                    element += `<td rowspan="4" class="date">${row.value.日付.value}</td>`;
                    element += `</tr>`;
                    for (const kubun of Object.keys(time_kubun)) {
                        element += '<tr>';
                        element += `<td class="label">${time_kubun[kubun].label}</td>`;
                        for (const category of categories) {
                            if (row.value[time_kubun[kubun].value + "_" + category.key] == undefined) {
                                // 初期値0として登録
                                row.value[time_kubun[kubun].value + "_" + category.key] = {
                                    "value": 0
                                }
                            }
                            let val = row.value[time_kubun[kubun].value + "_" + category.key].value;
                            element += `<td class="count_scope save_scope"><input type="number" value="${Number(val)}" data-datekey="${row.value.日付.value}" data-fieldkey="${time_kubun[kubun].value + "_" + category.key}"></td>`;
                        }
                        // 備考欄 textarea
                        let v = row.value[time_kubun[kubun].value + "_備考"].value == null ? "" : row.value[time_kubun[kubun].value + "_備考"].value;
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
                "body": {
                    "value": JSON.stringify(data, null, 2)
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

        const hostory_body = {
            "app": currentEnvGlobalConfig.APP.HISTORY_MANAGEMENT.AppID,
            "record": {
                "company_id": {
                    "value": event.record.company_id.value
                },
                "order_id": {
                    "value": event.record.$id.value
                },
                "data": {
                    "value": JSON.stringify(data, null, 4)
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
                },
                {
                    "method": "POST",
                    "api": "/k/v1/record.json",
                    "payload": hostory_body
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