import { getEnvGlobalConfig } from '../../../typescript/libs/envConfig';
import { KintoneRestAPI, formatDateTime, formatDate2, getCSV } from '../../../common/function.js';
(function () {
    "use strict";
    const currentEnvGlobalConfig = getEnvGlobalConfig();
    const EventTrigger = ["app.record.index.show"];

    kintone.events.on(EventTrigger, async function (event) {
        if (!currentEnvGlobalConfig.APP.ORDER.CUSTOMIZE.MainView.includes(event.viewId)) {
            console.log("Not MainView");
            console.log("current viewId:", event.viewId);
            return event;
        }

        const DefaultDate = new Date();
        DefaultDate.setDate(DefaultDate.getDate() + 2);

        const url = new URL(window.location.href);
        const params = url.searchParams;
        const base_date = params.get('date') == null ? DefaultDate : params.get('date');
        const save_kubun = params.get('save_kubun') == null ? "all" : params.get('save_kubun');
        const info_icon = "https://order-mealcs.com/img/info_icon.png";
        const info_red_icon = "https://order-mealcs.com/img/info_red_icon.png";

        const FilterJson = {
            "date": {
                "field": "start_date",
                "label": "日付",
                "id": "filter_date",
                "type": "date",
                "value": base_date,
            },
            "save_kubun": {
                "field": "save_kubun",
                "label": "保管区分",
                "id": "filter_save_kubun",
                "type": "select",
                "value": save_kubun,
                "options": ["全て", "チル食品", "冷凍食品", "2日前納品"]
            }
        }


        // base_dateの月曜日の日付を取得
        const start_date = getMonday(base_date);
        const end_date = new Date(start_date);
        end_date.setDate(end_date.getDate() + 7);
        const start_date_str = formatDate2(start_date, "yyyy-MM-dd");
        const end_date_str = formatDate2(end_date, "yyyy-MM-dd");
        // console.log(start_date_str);
        // console.log(end_date_str);
        const GetFieldElement = {
            "app": kintone.app.getId(),
            "lang": "default"
        }
        //フィールド情報取得
        const request1 = KintoneRestAPI(GetFieldElement, "GET", "field");
        const request2 = KintoneRestAPI({ "app": currentEnvGlobalConfig.APP.KUBUN_MASTER_DB.AppID, "query": "limit 500" }, "GET", "mul");

        // クエリ条件の分岐
        let save_kubun_query = "";
        if (save_kubun === "all") {
            save_kubun_query = `save_kubun in ("チル食品", "冷凍食品", "2日前納品")`;
        } else {
            save_kubun_query = `save_kubun in ("${save_kubun}")`;
        }

        const request3 = KintoneRestAPI({ "app": kintone.app.getId(), "query": `start_date >= "${start_date_str}" and start_date < "${end_date_str}" and ${save_kubun_query} order by 表示優先順位 asc limit 500` }, "GET", "mul");
        const response = await Promise.all([request1, request2, request3]);
        const fieldlist = response[0];
        const category_response = response[1];
        const list = response[2];
        const records = list.records;
        let SearchQuery = "";
        for (const record of records) {
            if (SearchQuery != "") {
                SearchQuery += " or ";
            }
            SearchQuery += `order_id = ${record.$id.value}`;
        }

        const hasNoResults = SearchQuery == "";

        let check_json = {};
        let history_records = [];
        let history_diff_info = {};

        if (!hasNoResults) {
            const TotalSearchQuery = `(${SearchQuery}) and order_date = "${formatDate2(new Date(base_date), "yyyy-MM-dd")}" limit 500`;
            const check_list = await KintoneRestAPI({ "app": currentEnvGlobalConfig.APP.CHECKLIST_DB.AppID, "query": TotalSearchQuery }, "GET", "mul");

            for (const record of check_list.records) {
                const order_id = record.order_id.value;
                const data = {
                    "record_id": record.$id.value,
                    "order_id": record.order_id.value,
                    "order_date": record.order_date.value,
                    "company_id": record.company_id.value,
                    "check_list": record.チェック一覧.value,
                }
                if (check_json[order_id] == undefined) {
                    check_json[order_id] = data;
                }
            }
            console.log("check_json", check_json);
            const recordsPerBatch = 20; // 一度に処理するレコード数
            let queries = [];
            for (let i = 0; i < records.length; i += recordsPerBatch) {
                let serach_id_query = "";
                for (let j = i; j < i + recordsPerBatch && j < records.length; j++) {
                    serach_id_query += `order_id = ${records[j].$id.value}`;
                    if (j != Math.min(i + recordsPerBatch, records.length) - 1) {
                        serach_id_query += " or ";
                    }
                }
                queries.push(serach_id_query);
            }

            const result = [];
            // 結果のクエリリストを出力
            queries.forEach((query, index) => {
                // console.log(`Query Batch ${index + 1}:`, query);
                const request = KintoneRestAPI({ "app": currentEnvGlobalConfig.APP.HISTORY_MANAGEMENT.AppID, "query": `${query} order by 作成日時 asc limit 500` }, "GET", "mul");
                result.push(request);
            });

            const history_response = await Promise.all(result);
            history_records = [];
            for (const records of history_response) {
                history_records = history_records.concat(records.records);
            }
            // レコード番号でソート
            history_records.sort((a, b) => {
                return a.レコード番号.value - b.レコード番号.value;
            });
            const history_data_json = {};
            for (var n = 0; n < history_records.length; n++) {
                try {
                    const record = history_records[n];
                    const company_id = record.company_id.value;
                    const data = JSON.parse(record.data.value);
                    const change_date = formatDateTime(new Date(record.作成日時.value), "MM/dd HH:mm");
                    const output_data = {
                        "date": change_date,
                        "createdAt": record.作成日時.value,
                        "data": {}
                    }
                    for (const row of data) {
                        const key_date = row.value.日付.value;
                        delete row.value.日付;
                        output_data["data"][key_date] = row.value;
                    }
                    if (history_data_json[company_id] == undefined) {
                        history_data_json[company_id] = [];
                    }
                    history_data_json[company_id].push(output_data);
                } catch (error) {
                    console.log(error);
                    continue;
                }
            }

            history_diff_info = {};
            Object.keys(history_data_json).forEach(company_id => {
                if (history_diff_info[company_id] == undefined) {
                    history_diff_info[company_id] = {};
                }
                history_diff_info[company_id][0] = history_data_json[company_id][0];
                let last_history = history_data_json[company_id][0];
                for (var p = 1; p < history_data_json[company_id].length; p++) {
                    const history_list = history_data_json[company_id][p];
                    Object.keys(history_list.data).forEach(date_key => {
                        Object.keys(history_list.data[date_key]).forEach(field_key => {
                            if (last_history.data[date_key] == undefined) {
                                return;
                            }
                            if (last_history.data[date_key][field_key] == undefined) {
                                return;
                            }
                            if (history_list.data[date_key][field_key]["value"] == null) {
                                history_list.data[date_key][field_key]["value"] = "";
                            }
                            if (last_history.data[date_key][field_key]["value"] == null) {
                                last_history.data[date_key][field_key]["value"] = "";
                            }
                            if (history_list.data[date_key][field_key]["value"] != last_history.data[date_key][field_key]["value"]) {
                                if (history_diff_info[company_id][p] == undefined) {
                                    history_diff_info[company_id][p] = {
                                        "date": history_list.date,
                                        "createdAt": history_list.createdAt,
                                        "data": {}
                                    };
                                }
                                // 差分がある場合
                                if (history_diff_info[company_id][p]["data"][date_key] == undefined) {
                                    history_diff_info[company_id][p]["data"][date_key] = {}
                                }
                                if (history_diff_info[company_id][p]["data"][date_key][field_key] == undefined) {
                                    history_diff_info[company_id][p]["data"][date_key][field_key] = {}
                                }
                                Object.assign(history_diff_info[company_id][p]["data"][date_key][field_key], history_list.data[date_key][field_key]);
                            }
                        });
                    });
                    last_history = history_list;
                }
            });
            console.log("history_diff_info", history_diff_info);
        }

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
        console.log("categories", categories);
        let csv_data = "";
        //表示する一覧
        const DisplayList = [
            {
                'key': '注文詳細',
                'custome_view': true,
                'custome_label': (function () {
                    csv_data += "施設名,日付,";
                    let element = `<th style="width:30px;" class="link_icon"></th>`;
                    element += `<th style="width:150px;" class="company_name">施設名</th>`;
                    element += `<th class="kubun kubun_icon" style="width:45px;">区分</th>`;
                    element += `<th class="kubun total" data-kubun="合計" style="width:45px;">合計</th>`;
                    for (const kubun of Object.keys(time_kubun)) {
                        csv_data += time_kubun[kubun].label + "_" + "合計" + ",";
                        for (const category of categories) {
                            csv_data += time_kubun[kubun].label + "_" + category.label + ",";
                        }
                        csv_data += time_kubun[kubun].label + "_" + "備考,";
                    }
                    csv_data = csv_data.slice(0, -1);
                    csv_data += "\n";

                    for (const category of categories) {
                        element += `<th class="kubun" data-kubun="${category.key}" style="width:45px;">${category.label}</th>`;
                    }
                    element += `<th class="kubun" data-kubun="備考" style="width:200px;">備考</th>`;
                    return element;
                }),
                'width': '140',
                'edit': 'readonly',
                'class': '',
                'CustomeStyle': '',
                'custome_value': (function (record, base_date, i) {
                    // 偶数なら an　
                    let num = i % 2;
                    let RowClass = "";
                    if (num == 0) {
                        RowClass = "even";
                    } else {
                        RowClass = "odd";
                    }
                    let element = "";
                    // record.body.value のdateとbase_dateが一致するものだけを表示
                    const data = JSON.parse(record.body.value);
                    const row = data.find((row) => row.value.日付.value == formatDate2(new Date(base_date), "yyyy-MM-dd"));
                    if (row == undefined) {
                        console.log(record.$id.value);
                        console.log("row is undefined");
                        window.alert("正しいデータが出力できませんでした。システム管理者にお問い合わせ下さい");
                        return "";
                    }

                    let ThisCheckList = check_json[record.$id.value] == undefined ?
                        {
                            "record_id": 0,
                            "order_id": record.$id.value,
                            "order_date": formatDate2(new Date(base_date), "yyyy-MM-dd"),
                            "company_id": record.company_id.value,
                            "check_list": []
                        }
                        : check_json[record.$id.value];

                    element += `<tr class="${RowClass}">`;
                    element += `<td style="text-align:center;" rowspan="4" class="link_icon"><a href="https://${currentEnvGlobalConfig.KINTONE_DOMAIN}.cybozu.com/k/${kintone.app.getId()}/show#record=${record.$id.value}" target="_blank"><img src="https://static.cybozu.com/contents/k/image/argo/component/recordlist/record-detail.png"></a></td>`;
                    element += `<td rowspan="4" style="width:140px;" class="company_name">${record.ログイン名.value}</td>`;
                    element += `</tr>`;
                    csv_data += `${record.ログイン名.value},${row.value.日付.value},`;
                    for (const kubun of Object.keys(time_kubun)) {
                        element += `<tr class="${RowClass}">`;
                        element += `<td class="label kubun_icon" data-order_id="${record.$id.value}" data-cateogyr="${time_kubun[kubun].label}" style="text-align:center;">${time_kubun[kubun].label}</td>`;
                        const total = Number(row.value[time_kubun[kubun].value + "_注文数"].value) + Number(row.value[time_kubun[kubun].value + "_検食"].value);
                        let add_class = check_system(ThisCheckList, time_kubun[kubun].label, "合計");
                        element += `<td class="value total ${add_class}" data-order_id="${record.$id.value}" data-company_id="${record.company_id.value}" data-check_id="${ThisCheckList.record_id}" data-key="合計" data-category="${time_kubun[kubun].label}">${total}</td>`;
                        csv_data += `${total},`;
                        for (const category of categories) {
                            let val = row.value[time_kubun[kubun].value + "_" + category.key] == null ? 0 : row.value[time_kubun[kubun].value + "_" + category.key].value;
                            csv_data += `${val},`;
                            let add_class = check_system(ThisCheckList, time_kubun[kubun].label, category.key);
                            // 履歴表示機能
                            let history_info_element = "<div class='history_info_box'>";
                            let display_count = 0;
                            let hasRecentChange = false;
                            const field_key = time_kubun[kubun].value + "_" + category.key;

                            // 現在時刻を基準に範囲を計算（毎日15時リセット）
                            const now = new Date();
                            const currentHour = now.getHours();

                            let startTime, endTime;

                            if (currentHour < 15) {
                                // 15時より前: 前日15時 〜 現在時刻
                                startTime = new Date(now);
                                startTime.setDate(startTime.getDate() - 1);
                                startTime.setHours(15, 0, 0, 0);
                                endTime = new Date(now);
                            } else {
                                // 15時以降: 当日15時 〜 現在時刻
                                startTime = new Date(now);
                                startTime.setHours(15, 0, 0, 0);
                                endTime = new Date(now);
                            }

                            if (history_diff_info[record.company_id.value] != undefined) {
                                Object.keys(history_diff_info[record.company_id.value]).forEach(key => {
                                    if (history_diff_info[record.company_id.value][key]["data"][row.value.日付.value] != undefined) {
                                        if (history_diff_info[record.company_id.value][key]["data"][row.value.日付.value][field_key] != undefined) {
                                            const history_date = history_diff_info[record.company_id.value][key]["date"];
                                            const history_data = history_diff_info[record.company_id.value][key]["data"][row.value.日付.value][field_key]["value"];
                                            history_info_element += `<div class="balloon" data-date="${history_date}" data-field="${field_key}">${history_date} : <span class="strong">${history_data}</span></div>`;
                                            display_count++;

                                            // 赤いアイコン判定: 現在時刻基準の範囲内の変更か確認（15時リセット）
                                            const createdAt = new Date(history_diff_info[record.company_id.value][key]["createdAt"]);
                                            if (createdAt >= startTime && createdAt <= endTime) {
                                                hasRecentChange = true;
                                            }
                                        }
                                    }
                                });
                            }
                            history_info_element += "</div>";
                            if (val == 0) {
                                val = "";
                            }

                            if (display_count > 1) {
                                const icon = hasRecentChange ? info_red_icon : info_icon;
                                element += `<td class="value ${add_class}" data-order_id="${record.$id.value}" data-company_id="${record.company_id.value}" data-check_id="${ThisCheckList.record_id}" data-key="${category.key}" data-category="${time_kubun[kubun].label}">${val}<img src="${icon}" alt="info_icon" width="15px" class="info_icon">${history_info_element}</td>`;
                            } else {
                                element += `<td class="value ${add_class}" data-order_id="${record.$id.value}" data-company_id="${record.company_id.value}" data-check_id="${ThisCheckList.record_id}" data-key="${category.key}" data-category="${time_kubun[kubun].label}">${val}</td>`;
                            }
                        }
                        let v = row.value[time_kubun[kubun].value + "_備考"].value == null ? "" : row.value[time_kubun[kubun].value + "_備考"].value;
                        csv_data += `${v.replace(/\n/g, " ")},`;
                        // \nを<br>に変換
                        v = v.replace(/\n/g, "<br>");
                        let other_add_class = check_system(ThisCheckList, time_kubun[kubun].label, "備考");
                        element += `<td class="note_scope value ${other_add_class}" data-order_id="${record.$id.value}" data-company_id="${record.company_id.value}" data-check_id="${ThisCheckList.record_id}" data-key="備考" data-category="${time_kubun[kubun].label}">${v}</td>`;
                        element += `</tr>`;
                    }
                    csv_data = csv_data.slice(0, -1);
                    csv_data += "\n";
                    return element;
                })
            }
        ];
        //一覧から詳細画面遷移可能なボタンの設置
        const ViewDetail = false;
        const element = document.getElementById('index_customise');

        let header = "";
        header += `<div class="header">`;
        Object.keys(FilterJson).forEach(function (key) {
            header += `<div class="filter">`;
            header += `<label>${FilterJson[key].label}</label>`;
            if (FilterJson[key].type === "select") {
                header += `<select id="${FilterJson[key].id}" class="kintoneplugin-select filter-select">`;
                FilterJson[key].options.forEach(function (option) {
                    const optionValue = option === "全て" ? "all" : option;
                    const selected = optionValue === FilterJson[key].value ? 'selected' : '';
                    header += `<option value="${optionValue}" ${selected}>${option}</option>`;
                });
                header += `</select>`;
            } else {
                header += `<input type="${FilterJson[key].type}" id="${FilterJson[key].id}" value="${FilterJson[key].value}">`;
            }
            header += `</div>`;
        });
        header += `<div class="filter">`;
        header += `<button id="filter">絞り込み</button>`;
        header += `</div>`;

        header += `<div class="filter">`;
        header += `<button id="output">CSV出力</button>`;
        header += `</div>`;
        header += `</div>`;

        let sec = "";

        if (hasNoResults) {
            sec += `<div class="no-results-message">注文はありません</div>`;
        } else {
            sec +=
                `
					<table>
						<thead>
					`;

            for (var n = 0; n < DisplayList.length; n++) {
                if (DisplayList[n].custome_view) {
                    sec += DisplayList[n].custome_label();
                }
            }
            sec +=
                `
            </thead>
            <tbody>
            `
                ;
            for (var i = 0; i < records.length; i++) {
                for (var n = 0; n < DisplayList.length; n++) {
                    if (DisplayList[n].custome_view) {
                        sec += DisplayList[n].custome_value(records[i], base_date, i);
                    }
                }
            }
            sec +=
                `
                </tbody>
            </table>
            `
                ;
        }

        element.innerHTML += sec;
        $(".kintone-app-headermenu-space").append(header);

        $('.history_info_box').each(function () {
            const balloons = $(this).children().get().reverse();
            $(this).append(balloons);
        });

        $(".kintone-app-headermenu-space #filter_date").val(formatDate2(new Date(base_date), "yyyy-MM-dd"));

        $(".kintone-app-headermenu-space #filter").on("click", function () {
            let date = $(".kintone-app-headermenu-space #filter_date").val();
            if (date == "") {
                const DefaultDate = new Date();
                DefaultDate.setDate(DefaultDate.getDate() + 2);
                date = formatDate2(DefaultDate, "yyyy-MM-dd");
            }
            date = formatDate2(new Date(date), "yyyy-MM-dd");
            let save_kubun_val = $(".kintone-app-headermenu-space #filter_save_kubun").val();
            if (save_kubun_val === "全て") {
                save_kubun_val = "all";
            }
            location.href = `https://${currentEnvGlobalConfig.KINTONE_DOMAIN}.cybozu.com/k/${kintone.app.getId()}/?view=${event.viewId}&date=${date}&save_kubun=${save_kubun_val}`;
        });

        $(".kintone-app-headermenu-space #output").on("click", function () {
            getCSV(csv_data, "発注一覧_" + base_date + ".csv");
            window.alert("CSVダウンロード開始します");
        });

        $('.info_icon').hover(
            function () {
                $(this).siblings('.history_info_box').css('display', 'block');
            },
            function () {
                $(this).siblings('.history_info_box').css('display', 'none');
            }
        );

        const handleCellClickEvent = async function (dom, e) {
            // イベントを一度解除
            $(dom).off("click");
            try {
                const target = $(e.target);
                let check_id = target.data("check_id");
                const key = target.data("key");
                const category = target.data("category");
                const order_id = target.data("order_id");
                const company_id = target.data("company_id");
                let body = {};
                let method = "POST";
                let check_list_data = [];
                if (check_id == 0) {
                    const GetResponse = await KintoneRestAPI({
                        "app": currentEnvGlobalConfig.APP.CHECKLIST_DB.AppID,
                        "query": `company_id = ${company_id} and order_id = ${order_id} and order_date = "${formatDate2(new Date(base_date), "yyyy-MM-dd")}" limit 1`,
                    }, "GET", "mul");
                    if (GetResponse.records.length == 0) {
                        Object.keys(time_kubun).forEach(function (kubun) {
                            check_list_data.push({
                                "value": {
                                    "category": {
                                        "value": time_kubun[kubun].label
                                    },
                                    "kubun": {
                                        "value": "合計"
                                    },
                                    "check_flg": {
                                        "value": []
                                    }
                                }
                            });
                            check_list_data.push({
                                "value": {
                                    "category": {
                                        "value": time_kubun[kubun].label
                                    },
                                    "kubun": {
                                        "value": "備考"
                                    },
                                    "check_flg": {
                                        "value": []
                                    }
                                }
                            });
                            for (const category of categories) {
                                check_list_data.push({
                                    "value": {
                                        "category": {
                                            "value": time_kubun[kubun].label
                                        },
                                        "kubun": {
                                            "value": category.key
                                        },
                                        "check_flg": {
                                            "value": []
                                        }
                                    }
                                });
                            }
                        });
                        body = {
                            "app": currentEnvGlobalConfig.APP.CHECKLIST_DB.AppID,
                            "record": {
                                "order_id": {
                                    "value": order_id
                                },
                                "company_id": {
                                    "value": company_id
                                },
                                "order_date": {
                                    "value": formatDate2(new Date(base_date), "yyyy-MM-dd")
                                },
                                "チェック一覧": {
                                    "value": check_list_data
                                }
                            }
                        }
                    } else {
                        method = "PUT";
                        check_list_data = GetResponse.records[0].チェック一覧.value;
                        body = {
                            "app": currentEnvGlobalConfig.APP.CHECKLIST_DB.AppID,
                            "id": GetResponse.records[0].$id.value,
                            "record": {
                                "チェック一覧": {
                                    "value": check_list_data
                                }
                            }
                        }
                    }
                } else {
                    method = "PUT";
                    const response = await KintoneRestAPI({ "app": currentEnvGlobalConfig.APP.CHECKLIST_DB.AppID, "id": check_id }, "GET", "single");
                    check_list_data = response.record.チェック一覧.value;
                    // categoriesに存在していてcheck_list_dataに存在しない場合は追加
                    for (const category of categories) {
                        const check_list = check_list_data.find((item) => item.value.kubun.value == category.key);
                        if (check_list == undefined) {
                            Object.keys(time_kubun).forEach(function (kubun) {
                                check_list_data.push({
                                    "value": {
                                        "category": {
                                            "value": time_kubun[kubun].label
                                        },
                                        "kubun": {
                                            "value": category.key
                                        },
                                        "check_flg": {
                                            "value": []
                                        }
                                    }
                                });
                            });
                        }
                    }
                    body = {
                        "app": currentEnvGlobalConfig.APP.CHECKLIST_DB.AppID,
                        "id": check_id,
                        "record": {
                            "チェック一覧": {
                                "value": check_list_data
                            }
                        }
                    }
                }

                if (target.hasClass("checked")) {
                    // クリックした要素がすでに選択されている場合
                    check_list_data = add_check_system({ "check_list": check_list_data }, category, key, []);
                    body.record.チェック一覧.value = check_list_data;
                    await KintoneRestAPI(body, method, "single");
                    target.removeClass("checked");
                } else {
                    // クリックした要素が選択されていない場合
                    check_list_data = add_check_system({ "check_list": check_list_data }, category, key, ["済"]);
                    body.record.チェック一覧.value = check_list_data;
                    await KintoneRestAPI(body, method, "single");
                    target.addClass("checked");
                }
                console.log("check_list_data", check_list_data);
            } catch (error) {
                console.log(error);
                window.alert("チェック保存に失敗しました");
            } finally {
                // 処理が終わったら再度イベントを設定
                $(dom).on("click", async function (e) {
                    await handleCellClickEvent(dom, e);
                });
            }
        };

        // セル反転イベント
        const dom = "#index_customise table tbody td.value";
        $(dom).on("click", async function (e) {
            await handleCellClickEvent(dom, e);
        });

        // ホバー色付イベント
        $(dom).hover(
            function (e) {
                const target = $(e.target);
                const key = target.data("key");
                const category = target.data("category");
                const order_id = target.data("order_id");

                // リセット
                $("table tbody .kubun_icon").removeClass("hover_active");
                $("table thead .kubun").removeClass("hover_active");

                // 再度クラス追加
                $("table tbody .kubun_icon[data-cateogyr='" + category + "'][data-order_id='" + order_id + "']").addClass("hover_active");
                $("table thead .kubun[data-kubun='" + key + "']").addClass("hover_active");
            }
        );
        // ホバー解除イベント
        $(dom).mouseleave(function (e) {
            $("table tbody .kubun_icon").removeClass("hover_active");
            $("table thead .kubun").removeClass("hover_active");
        });


        let no_data_check_json = {};
        // 注文がない場合の非表示処理
        $(dom).each(function () {
            const target = $(this);
            let check_id = target.data("check_id");
            const key = target.data("key");
            const category = target.data("category");
            const order_id = target.data("order_id");
            const company_id = target.data("company_id");
            const value = target.text();
            if (key == "備考") {
                return;
            }
            if (no_data_check_json[key] == undefined) {
                no_data_check_json[key] = {
                    "count": 0,
                }
            }
            no_data_check_json[key].count += Number(value);
        });
        console.log("no_data_check_json", no_data_check_json);

        Object.keys(no_data_check_json).forEach(function (key) {
            if (no_data_check_json[key].count == 0) {
                $("#index_customise table thead .kubun[data-kubun='" + key + "']").css("display", "none");
                $("#index_customise table tbody .value[data-key='" + key + "']").css("display", "none");
            }
        });
        // 途中で項目足した場合にも動くように
    });

    function check_system(db, category, kubun) {
        let response_flg = "";
        for (const list of db.check_list) {
            const list_category = list.value.category.value;
            const list_kubun = list.value.kubun.value;
            const check_flg = list.value.check_flg.value;
            if (list_category == category && list_kubun == kubun && check_flg.length > 0) {
                response_flg = "checked";
                break;
            }
        }
        return response_flg;
    }

    function add_check_system(db, category, kubun, check_flg) {
        for (var i = 0; i < db.check_list.length; i++) {
            const list_category = db.check_list[i].value.category.value;
            const list_kubun = db.check_list[i].value.kubun.value;
            if (list_category == category && list_kubun == kubun) {
                db.check_list[i].value.check_flg.value = check_flg;
                break;
            }
        }
        return db.check_list;
    }

    function getMonday(base_date) {
        const d = new Date(base_date);
        const dayOfWeek = d.getDay();
        const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
        const mondayDate = d;
        mondayDate.setDate(d.getDate() + diff);
        return mondayDate;
    }
})();