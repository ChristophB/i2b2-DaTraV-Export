# i2b2-exportSQL
A plugin to export the SQL code from a previously executed query. The SQL code is going to be valid to a database with the same structure as shown in https://www.dimdi.de/static/de/versorgungsdaten/datensatzbeschreibung/index.htm .

# How to install:
- add the following to the "i2b2_loader.js" usually in the folder "/var/www/html/webclient/js-i2b2":
  { code: "DaTraVExport",
    forceLoading: true,
    forceConfigMsg: { params: [] },
    forceDir: "cells/plugins"
  },

- clone the repository in a folder "DaTraVExport" in "/var/www/html/webclient/js-i2b2/cells/plugins"
