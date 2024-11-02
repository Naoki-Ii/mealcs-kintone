(function () {
    //フィールドコード表示機能(field code)
    kintone.events.on(['app.record.create.show', 'app.record.detail.show', 'app.record.edit.show'], function (event) {
        if (document.getElementById('system_display_btn') !== null) {
            return;
        }
        const system_display_btn = document.createElement('button');
        system_display_btn.id = 'system_display_btn';
        system_display_btn.innerText = 'Field Code表示';
        system_display_btn.onclick = function () {
            var allFieldList = [];
            var SubTableList = [];
            Object.keys(
                cybozu.data.page.FORM_DATA.schema.table.fieldList
            ).forEach((fieldId) => {
                const fieldDetail = cybozu.data.page.FORM_DATA.schema.table.fieldList[fieldId];
                const Each = {
                    [fieldId]: {
                        'detail': fieldDetail,
                        'tableName': '',
                        'tableValue': '',
                    }
                }
                allFieldList = Object.assign(allFieldList, Each);
            });

            Object.keys(cybozu.data.page.FORM_DATA.schema.subTable).forEach(
                (tableId) => {
                    const fieldList = cybozu.data.page.FORM_DATA.schema.subTable[tableId].fieldList;
                    Object.keys(fieldList).forEach((fieldId) => {
                        const tableName = cybozu.data.page.FORM_DATA.schema.subTable[tableId].label;
                        const fieldcode = cybozu.data.page.FORM_DATA.schema.subTable[tableId].var;
                        const fieldDetail = fieldList[fieldId];
                        const Each = {
                            [fieldId]: {
                                'detail': fieldDetail,
                                'tableName': tableName,
                                'tableValue': fieldcode,
                            }
                        }
                        allFieldList = Object.assign(allFieldList, Each);
                    });
                    const TableInfo = cybozu.data.page.FORM_DATA.schema.subTable[tableId];
                    const Each = {
                        [TableInfo.id]: {
                            'tableName': TableInfo.label,
                            'tableValue': TableInfo.var,
                            'id': TableInfo.id,
                        }
                    }
                    SubTableList = Object.assign(SubTableList, Each);
                }
            );

            //console.log(allFieldList);
            console.log(SubTableList);

            Object.keys(allFieldList).forEach((key) => {
                $('.label-' + allFieldList[key].detail.id + ' span.control-label-text-gaia').text(allFieldList[key].detail.label + " / " + allFieldList[key].detail.var);
                $('.label-' + allFieldList[key].detail.id + ' span.subtable-label-inner-gaia').text(allFieldList[key].detail.label + " / " + allFieldList[key].detail.var);
            });

            Object.keys(SubTableList).forEach((key) => {
                const dom = $('.subtable-row-label-' + SubTableList[key].id + ' span.control-label-text-gaia').text(SubTableList[key].tableName + " / " + SubTableList[key].tableValue);

            });

        };
        kintone.app.record.getSpaceElement('system_display_btn').appendChild(system_display_btn);

    });
})();