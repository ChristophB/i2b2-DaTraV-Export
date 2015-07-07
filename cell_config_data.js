// this file contains a list of all files that need to be loaded dynamically for this plugin
// every file in this list will be loaded after the plugin's Init function is called
{
	files:[ "ExportSQL_ctrlr.js" ],
	css:[ "vwExportSQL.css" ],
	config: {
		// additional configuration variables that are set by the system
		short_name: "ExportSQL",
		name: "ExportSQL",
		description: "This plugin generates and exports the Oracle-SQL statement, valid for the database structure of the DaTraV database.",
		category: ["celless","plugin","examples"],
		plugin: {
			isolateHtml: false,  // this means do not use an IFRAME
			isolateComm: false,  // this means to expect the plugin to use AJAX communications provided by the framework
			standardTabs: true, // this means the plugin uses standard tabs at top
			html: {
				source: 'injected_screens.html',
				mainDivId: 'ExportSQL-mainDiv'
			}
		}
	}
}
