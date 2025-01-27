import { getEnvGlobalConfig } from '../../../typescript/libs/envConfig';
import { KintoneRestAPI, formatDateTime, formatDate2, getCSV } from '../../../common/function.js';
(function () {
    "use strict";
    const currentEnvGlobalConfig = getEnvGlobalConfig();
    const EventTrigger = ["app.record.index.show"];

    kintone.events.on(EventTrigger, async function (event) {
        if (event.viewId != currentEnvGlobalConfig.APP.ORDER.CUSTOMIZE.MainView) {
            return event;
        }

        const DefaultDate = new Date();
        DefaultDate.setDate(DefaultDate.getDate() + 2);

        const url = new URL(window.location.href);
        const params = url.searchParams;
        const base_date = params.get('date') == null ? DefaultDate : params.get('date');

        const FilterJson = {
            "date": {
                "field": "start_date",
                "label": "日付",
                "id": "filter_date",
                "type": "date",
                "value": base_date,
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
        const fieldlist = await KintoneRestAPI(GetFieldElement, "GET", "field");
        const category_response = await KintoneRestAPI({ "app": currentEnvGlobalConfig.APP.KUBUN_MASTER_DB.AppID, "query": "limit 500" }, "GET", "mul");
        const list = await KintoneRestAPI({ "app": kintone.app.getId(), "query": `start_date >= "${start_date_str}" and start_date < "${end_date_str}" order by 表示優先順位 asc limit 500` }, "GET", "mul");
        const records = list.records;
        const info_icon = "https://order-mealcs.com/img/info_icon.png";

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
        let history_records = [];
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

        let hisotry_diff_info = {};
        Object.keys(history_data_json).forEach(company_id => {
            if (hisotry_diff_info[company_id] == undefined) {
                hisotry_diff_info[company_id] = {};
            }
            hisotry_diff_info[company_id][0] = history_data_json[company_id][0];
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
                            if (hisotry_diff_info[company_id][p] == undefined) {
                                hisotry_diff_info[company_id][p] = {
                                    "date": history_list.date,
                                    "data": {}
                                };
                            }
                            // 差分がある場合
                            if (hisotry_diff_info[company_id][p]["data"][date_key] == undefined) {
                                hisotry_diff_info[company_id][p]["data"][date_key] = {}
                            }
                            if (hisotry_diff_info[company_id][p]["data"][date_key][field_key] == undefined) {
                                hisotry_diff_info[company_id][p]["data"][date_key][field_key] = {}
                            }
                            Object.assign(hisotry_diff_info[company_id][p]["data"][date_key][field_key], history_list.data[date_key][field_key]);
                        }
                    });
                });
                last_history = history_list;
            }
        });
        console.log("hisotry_diff_info", hisotry_diff_info);

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
        let csv_data = "";
        //表示する一覧
        const DisplayList = [
            {
                'key': '注文詳細',
                'custome_view': true,
                'custome_label': (function () {
                    csv_data += "会社名,日付,";
                    let element = `<th style="min-width:10px;"></th>`;
                    element += `<th class="date">会社名</th>`;
                    element += `<th class="date">日付</th>`;
                    element += `<th class="kubun" style="width:45px;">区分</th>`;
                    element += `<th class="kubun" style="width:45px;">合計</th>`;
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
                        element += `<th class="kubun" style="width:45px;">${category.label}</th>`;
                    }
                    element += `<th class="kubun" style="min-width:200px;">備考</th>`;
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
                    // record.発注明細.value のdateとbase_dateが一致するものだけを表示
                    const row = record.発注明細.value.find((row) => row.value.日付.value == formatDate2(new Date(base_date), "yyyy-MM-dd"));
                    if (row == undefined) {
                        console.log(record.$id.value);
                        console.log("row is undefined");
                        window.alert("正しいデータが出力できませんでした。システム管理者にお問い合わせ下さい");
                        return "";
                    }
                    element += `<tr class="${RowClass}">`;
                    element += `<td style="text-align:center;" rowspan="4"><a href="https://${currentEnvGlobalConfig.KINTONE_DOMAIN}.cybozu.com/k/${kintone.app.getId()}/show#record=${record.$id.value}" target="_blank"><img src="https://static.cybozu.com/contents/k/image/argo/component/recordlist/record-detail.png"></a></td>`;
                    element += `<td rowspan="4" class="date" style="width:140px;">${record.company_name.value}</td>`;
                    element += `<td rowspan="4" class="date">${row.value.日付.value}</td>`;
                    element += `</tr>`;
                    csv_data += `${record.company_name.value},${row.value.日付.value},`;
                    for (const kubun of Object.keys(time_kubun)) {
                        element += `<tr class="${RowClass}">`;
                        element += `<td class="label" style="text-align:center;">${time_kubun[kubun].label}</td>`;
                        const total = Number(row.value[time_kubun[kubun].value + "_注文数"].value) + Number(row.value[time_kubun[kubun].value + "_検食"].value);
                        element += `<td>${total}</td>`;
                        csv_data += `${total},`;
                        for (const category of categories) {
                            let val = row.value[time_kubun[kubun].value + "_" + category.key].value;
                            csv_data += `${val},`;

                            // 履歴表示機能
                            let history_info_element = "<div class='history_info_box'>";
                            let display_count = 0;
                            if (hisotry_diff_info[record.company_id.value] != undefined) {
                                Object.keys(hisotry_diff_info[record.company_id.value]).forEach(key => {
                                    if (hisotry_diff_info[record.company_id.value][key]["data"][row.value.日付.value] != undefined) {
                                        if (hisotry_diff_info[record.company_id.value][key]["data"][row.value.日付.value][time_kubun[kubun].value + "_" + category.key] != undefined) {
                                            const history_date = hisotry_diff_info[record.company_id.value][key]["date"];
                                            const history_data = hisotry_diff_info[record.company_id.value][key]["data"][row.value.日付.value][time_kubun[kubun].value + "_" + category.key]["value"];
                                            history_info_element += `<div class="balloon" data-date="${history_date}" data-field="${time_kubun[kubun].value + "_" + category.key}">${history_date} : <span class="strong">${history_data}</span></div>`;
                                            display_count++;
                                        }
                                    }
                                });
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
                        let v = row.value[time_kubun[kubun].value + "_備考"].value;
                        csv_data += `${v.replace(/\n/g, " ")},`;
                        // \nを<br>に変換
                        v = v.replace(/\n/g, "<br>");
                        element += `<td class="note_scope">${v}</td>`;
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
            header += `<input type="${FilterJson[key].type}" id="${FilterJson[key].id}" value="${FilterJson[key].value}">`;
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
            location.href = `https://${currentEnvGlobalConfig.KINTONE_DOMAIN}.cybozu.com/k/${kintone.app.getId()}/?view=${currentEnvGlobalConfig.APP.ORDER.CUSTOMIZE.MainView}&date=${date}`;
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
    });

    function getMonday(base_date) {
        const d = new Date(base_date);
        const dayOfWeek = d.getDay();
        const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
        const mondayDate = d;
        mondayDate.setDate(d.getDate() + diff);
        return mondayDate;
    }
})();