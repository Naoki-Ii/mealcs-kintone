(function () {
    "use strict";

    kintone.events.on('app.record.edit.show', function (event) {
        event.record.key.disabled = true;
        return event;
    });

})();