(function () {
    "use strict";

    const EventTrigger = [
        "app.record.index.show",
    ];

    kintone.events.on(EventTrigger, function (event) {

        const migrationButton = document.createElement("button");
        migrationButton.innerText = "Migrate DB";
        migrationButton.id = "migration-button";

        migrationButton.onclick = async function () {
            const confirmAction = confirm("マイグレーションを実行しますか？");
            if (!confirmAction) {
                return;
            }

            const appId = kintone.app.getId();
            const records = event.records;
            const UpdateBody = {
                "app": appId,
                "records": []
            }
            for (const record of records) {
                const table = record.発注明細.value;
                const body = {
                    "id": record.$id.value,
                    "record": {
                        "body": {
                            "value": JSON.stringify(table, null, 2)
                        }
                    }
                }
                UpdateBody.records.push(body);
            }
            if (UpdateBody.records.length === 0) {
                console.log("No records to update.");
                return;
            }

            try {
                const response = await kintone.api(kintone.api.url("/k/v1/records", true), "PUT", UpdateBody);
                console.log("Records updated successfully:", response);
            } catch (error) {
                console.error("Error updating records:", error);
                alert("レコードの更新に失敗しました。");
                return;
            }
        }

        const headerSpace = kintone.app.getHeaderMenuSpaceElement();
        if (headerSpace) {
            headerSpace.appendChild(migrationButton);
        } else {
            console.error("Header space element not found.");
        }
    });
})();