/* this function is called after the HTML is loaded into the viewer DIV */
i2b2.ExportSQL.Init = function(loadedDiv) {
    var qmDivName      = 'ExportSQL-QMDROP';
    var conceptDivName = 'ExportSQL-IDROP';
    var op_trgt        = { dropTarget: true };
    var cfgObj         = { activeIndex: 0 };
    var startYear      = 2009;
    var endYear        = new Date().getFullYear();
    var yearOptions    = '<option>---</option>';

    for (var year = startYear; year <= endYear; year++) {
	yearOptions += '<option>' + year + '</option>';
    }
    document.getElementById('fromYear').innerHTML = yearOptions;
    document.getElementById('toYear').innerHTML   = yearOptions;

    i2b2.ExportSQL.model.tablespace = 'tablespace';
    i2b2.ExportSQL.model.concepts   = [];

    i2b2.sdx.Master.AttachType(qmDivName, 'QM', op_trgt);
    i2b2.sdx.Master.AttachType(conceptDivName, 'CONCPT', op_trgt);

    i2b2.sdx.Master.setHandlerCustom(qmDivName, 'QM', 'DropHandler', function(sdxData) { i2b2.ExportSQL.doDrop(sdxData); });
    i2b2.sdx.Master.setHandlerCustom(conceptDivName, 'CONCPT', 'DropHandler', function(sdxData) { i2b2.ExportSQL.doDropConcept(sdxData); });

    i2b2.ExportSQL.redrawMessagePanel();

    this.yuiTabs = new YAHOO.widget.TabView('ExportSQL-TABS', cfgObj);
};

/* this function is called before the plugin is unloaded by the framework */
i2b2.ExportSQL.Unload = function() {
    return true;
};

i2b2.ExportSQL.setYear = function() {
    var fromYear = document.getElementById('fromYear');
    var toYear   = document.getElementById('toYear');

    fromYear = fromYear.options[fromYear.selectedIndex].text;
    toYear   = toYear.options[toYear.selectedIndex].text;
    
    i2b2.ExportSQL.model.fromYear = fromYear;
    i2b2.ExportSQL.model.toYear   = toYear;

    i2b2.ExportSQL.checkModel();
}

i2b2.ExportSQL.redrawMessagePanel = function() {
    var message     = '';
    var qmText      = 'Drop a previous executed Query from the bottom left "Previous Queries" window.';
    var yearText    = 'Specify at least a start-year.';
    var conceptText = 'Drop some concepts (no catalogues).';
    var fromYear    = i2b2.ExportSQL.model.fromYear;
    var toYear      = i2b2.ExportSQL.model.toYear;
    var concepts    = i2b2.ExportSQL.model.concepts;

    if (i2b2.ExportSQL.model.qm)
	message += '<li>' + qmText + ' &#10004;</li>';
    else message += '<b><li>' + qmText + '</li></b>';
 
    if (!isNaN(fromYear) && (isNaN(toYear) || fromYear <= toYear))
	message += '<li>' + yearText + ' &#10004;</li>';
    else message += '<b><li>' + yearText + '</li></b>';
	
    if (concepts && concepts.length > 0)
	message += '<li>' + conceptText + ' &#10004;</li>';
    else message += '<b><li>' + conceptText + '</li></b>';

    document.getElementById('messagePanel').innerHTML = '<ol>' + message + '</ol>';
}

i2b2.ExportSQL.doDrop = function(sdxData) {
    sdxData = sdxData[0];
    i2b2.ExportSQL.model.qm = sdxData;

    $('ExportSQL-QMDROP').innerHTML = i2b2.h.Escape(sdxData.sdxInfo.sdxDisplayName);

    i2b2.ExportSQL.checkModel();		
}

i2b2.ExportSQL.checkModel = function() {
    var fromYear = i2b2.ExportSQL.model.fromYear;
    var toYear   = i2b2.ExportSQL.model.toYear;
    var concepts = i2b2.ExportSQL.model.concepts;

    if (!isNaN(fromYear) && (isNaN(toYear) || fromYear <= toYear)
	&& concepts && concepts.length > 0
	&& i2b2.ExportSQL.model.qm
       ) {
	i2b2.ExportSQL.model.dirtyResultsData = true;
    } else i2b2.ExportSQL.model.dirtyResultsData = false;
    
    i2b2.ExportSQL.redrawMessagePanel();
}

i2b2.ExportSQL.doDropConcept = function(sdxData) {
    sdxData = sdxData[0];
    sdxData.dimdiColumn = sdxData.sdxInfo.sdxKeyValue.replace(/(.*?\\)(SA\d\d\d.*?)(\\$)/, '$2');

    if (!sdxData.dimdiColumn.match(/SA\d\d\d[^\\]*$/))
	return;

    i2b2.ExportSQL.model.concepts.push(sdxData);
    i2b2.ExportSQL.model.concepts = i2b2.ExportSQL.uniqueElements(i2b2.ExportSQL.model.concepts);
    i2b2.ExportSQL.redrawConceptDiv();
    
    i2b2.ExportSQL.checkModel();
}

i2b2.ExportSQL.deleteItem = function(sdxKeyValue) {
    var concepts = [];
    for (i = 0; i < i2b2.ExportSQL.model.concepts.length; i++) {
	var concept = i2b2.ExportSQL.model.concepts[i];
	if (concept.dimdiColumn != sdxKeyValue)
	    concepts.push(concept);
    }
    i2b2.ExportSQL.model.concepts = concepts;
    i2b2.ExportSQL.model.concepts = i2b2.ExportSQL.uniqueElements(i2b2.ExportSQL.model.concepts);
    i2b2.ExportSQL.redrawConceptDiv();

    i2b2.ExportSQL.checkModel();
}

i2b2.ExportSQL.redrawConceptDiv = function() {    
    var icon      = 'sdx_ONT_CONCPT_leaf.gif'; // 'sdx_ONT_CONCPT_branch-exp.gif';
    var innerHTML = i2b2.ExportSQL.model.concepts.map(
	function(x) { 
	    return '<span class="dropedItem" onclick="i2b2.ExportSQL.deleteItem(\'' + x.dimdiColumn + '\')" title="' + x.dimdiColumn + '">'
		+ '<img src="js-i2b2/cells/ONT/assets/' + icon + '">'
		+ '&nbsp;&nbsp;' + x.sdxInfo.sdxDisplayName
		+ '</span>';
	}
    ).join('<br>');

    if (!innerHTML)
	innerHTML = 'Drop concepts here';
    $('ExportSQL-IDROP').innerHTML = innerHTML;
}

/* Refresh the display with info of the SDX record that was DragDropped */
i2b2.ExportSQL.getResults = function() {
    if (!i2b2.ExportSQL.model.dirtyResultsData) {
	return;
    }
    var qm_id      = i2b2.ExportSQL.model.qm.sdxInfo.sdxKeyValue;
    var sdxDisplay = $$('DIV#ExportSQL-mainDiv DIV#ExportSQL-InfoSDX')[0];
    
    try {
	var result     = i2b2.ExportSQL.processQM(qm_id);
	var tempTables = i2b2.ExportSQL.uniqueElements(result[0].match(/temp_group_g\d+ /g));

	result[0] += '<br><br>' + i2b2.ExportSQL.processItems(tempTables);
	Element.select(sdxDisplay, '.sql')[0].innerHTML 
	    = '<pre>' + result[0] + '</pre>';
	// Element.select(sdxDisplay, '.msgResponse')[0].innerHTML 
	// 	= '<pre>' + i2b2.h.Escape(result[1]) + '</pre>';
	$$("DIV#ExportSQL-mainDiv DIV#ExportSQL-TABS DIV.results-finished")[0].show();
    } catch (e) {
	alert(e);
    }

    i2b2.ExportSQL.model.dirtyResultsData = false;
}

/**
 *
 */
i2b2.ExportSQL.uniqueElements = function(array) {
    var result = [];

    for (var i = 0; i < array.length; i++) {
	if (result.indexOf(array[i]) == -1)
	    result.push(array[i]);
    }

    return result;
}

/**
 * generates "create temporary table" statements for a given QM-ID
 * this function is called recursively, if the specified query contains subqueries
 *
 * @param {integer} qm_id - ID of a querymaster
 * @param {string} outerPanelNumber - panelNumber of a panel, in which the query is embedded
 * @param {integer} outerExclude - 1 if the outer panel has "exclude" selected
 *
 * @return {Object} array with 1: generated SQL and 2: XML-message of the QM
 */
i2b2.ExportSQL.processQM = function(qm_id, outerPanelNumber, outerExclude) {
    var msg_vals   = { qm_key_value: qm_id };
    var results    = i2b2.CRC.ajax.getRequestXml_fromQueryMasterId('Plugin:ExportSQL', msg_vals);
    var tablespace = i2b2.ExportSQL.model.tablespace;

    // did we get a valid query definition back? 
    var queryDef = i2b2.h.XPath(results.refXML, 'descendant::query_name/..');
    if (queryDef.length == 0) {
	throw 'processQM(): invalide query definition';
    }

    var statement   = i2b2.ExportSQL.getStatementObj();
    var timing      = i2b2.h.getXNodeVal(queryDef[0],'query_timing');
    var specificity = i2b2.h.getXNodeVal(queryDef[0],'specificity_scale');
    var panels      = i2b2.h.XPath(queryDef[0], 'descendant::panel');
    var sql         = '';
    var resultSql   = '<br><br>CREATE TEMPORARY TABLE ' + tablespace + '.temp_result' 
	+ (outerPanelNumber ? '_' + outerPanelNumber : '') + ' AS (<br>';

    // extract the data for each panel
    for (var pnr = 0; pnr < panels.length; pnr++) {
	var panelNumber        = 'g' + i2b2.h.getXNodeVal(panels[pnr], 'panel_number');
	var panelExclude       = i2b2.h.getXNodeVal(panels[pnr], 'invert');
	var panelTiming        = i2b2.h.getXNodeVal(panels[pnr], 'panel_timing') || 'ANY';
	var panelOccurences    = i2b2.h.getXNodeVal(panels[pnr], 'total_item_occurrences');
	var panelAccuracy      = i2b2.h.getXNodeVal(panels[pnr], 'panel_accuracy_scale');					
	var panelDateFrom      = i2b2.ExportSQL.extractDate(i2b2.h.getXNodeVal(panels[pnr], 'panel_date_from'));
	var panelDateTo        = i2b2.ExportSQL.extractDate(i2b2.h.getXNodeVal(panels[pnr], 'panel_date_to'));
	var panelItems         = i2b2.h.XPath(panels[pnr], 'descendant::item[item_key]');
	var subQueryCounter    = 1;
	var subQueryTempTables = [];

	if (outerPanelNumber)
	    panelNumber = outerPanelNumber + '_' + panelNumber;
	if (outerExclude == 1 && panelExclude == 1)
	    panelExclude = 0;

	statement.addItemGroup(
	    panelNumber, panelExclude, panelTiming, panelOccurences, 
	    panelAccuracy, panelDateFrom, panelDateTo
	);

	for (var itemNum = 0; itemNum < panelItems.length; itemNum++) {
	    var hlevel     = i2b2.h.getXNodeVal(panelItems[itemNum], 'hlevel');
	    var item_key   = i2b2.h.getXNodeVal(panelItems[itemNum], 'item_key');
	    var item_icon  = i2b2.h.getXNodeVal(panelItems[itemNum], 'item_icon');
	    var constraint = i2b2.h.XPath(panelItems[itemNum], 'descendant::constrain_by_value');
	    var operator, value, type;

	    if (!(item_key.includes('SA') || item_key.includes('masterid:'))) {
		$$('DIV#ExportSQL-mainDiv DIV#ExportSQL-TABS DIV.results-invalidQuery')[0].show();
		return;
	    }

	    if (constraint != null) {
		operator = i2b2.h.getXNodeVal(constraint[0], 'value_operator');
		value    = i2b2.h.getXNodeVal(constraint[0], 'value_constraint');
		type     = i2b2.h.getXNodeVal(constraint[0], 'value_type');
	    }

	    if (item_key.includes('masterid:')) {
		var masterid = item_key.replace('masterid:', '');
		var subQuery = i2b2.ExportSQL.processQM(
		    masterid
		    , panelNumber + '_q' + subQueryCounter
		    , panelExclude
		);

		// subQueryTempTables = subQueryTempTables.concat(
		    // subQuery[0].match(/temp_result_g[gq0-9_]*/)
		// );

		subQueryTempTables.push(tablespace + '.temp_result_' + panelNumber + '_q' + subQueryCounter);

		subQueryCounter++;
		sql += subQuery[0];

		continue;
	    }

	    statement.addItem(item_key, item_icon, operator, value);
	}

	if (subQueryTempTables.length > 0) {
	    subQueryTempTables = i2b2.ExportSQL.uniqueElements(subQueryTempTables);
	    
	    resultSql += '(SELECT psid FROM ' + tablespace + '.temp_group_' + panelNumber + '<br>UNION<br>'
		+ subQueryTempTables.map(
		    function(x) { return 'SELECT psid FROM ' + x; }
		).join('<br>UNION<br>')
		+ ')';
	} else {
	    resultSql += 'SELECT psid FROM ' + tablespace + '.temp_group_' + panelNumber;
	}

	if (pnr < panels.length - 1) {
	    resultSql += '<br>INTERSECT<br>';
	}
    }
    resultSql += '<br>);<br><br>';
    sql = statement.toString2() + sql + resultSql;

    return new Array(sql, results.msgResponse);
}

/**
 * transforms a string to an array containing year, month and day
 *
 * @param {string} string - containing date and time
 *
 * @return {Object} date
 * @return {Object} date.Year
 * @return {Object} date.Month
 * @return {Object} date.Day
 */
i2b2.ExportSQL.extractDate = function(string) {
    var date = {};
    if (string) {
	string = string.replace('Z','');
	string = string.split('-');

	date.Year  = string[0];
	date.Month = string[1];
	date.Day   = string[2];
	
	return date;
    } else {
	return null;
    }
}

/**
 * transformes an array of table expressions to a string
 * joins are realised as FULL (OUTER) JOIN
 *
 * @param {Object} array - array of table expressions
 *
 * @return {string} SQL
 */
i2b2.ExportSQL.tableArrayToString = function(array) {
    var sql = '';
    var prevTable;

    for (var i = 0; i < array.length; i++) {
	if (prevTable) {
	    var prevSatzart    = String(prevTable).replace(/(.*?)(SA\d\d\d)(.*)/, '$2');
	    var curSatzart     = String(array[i]).replace(/(.*?)(SA\d\d\d)(.*)/, '$2');
	    var joinConstraint = '';

	    if (prevSatzart == curSatzart) {
		joinConstraint = '<br>USING (' + curSatzart + '_PSID)<br>';
	    } else {
		joinConstraint = '<br>ON (' + prevSatzart + '_PSID = ' + curSatzart + '_PSID)<br>';
	    }

	    sql += '<br>FULL JOIN<br>' + array[i] + joinConstraint;
	} else {
	    sql += array[i];
	}

	prevTable = array[i];
    }
	
    return sql;
}

/**
 * creates the final SELECT statement
 *
 * @param {Object} tempTables - array of all created temporary tables
 * @param {Object} items - array of all selected items, by user
 *
 * @return {string} select statement
 */
i2b2.ExportSQL.processItems = function(tempTables) {
    var sql          = '';
    var inConstraint = i2b2.ExportSQL.generateInConstraintForTables(tempTables);
    var items        = i2b2.ExportSQL.model.concepts.map(function(x) { return x.dimdiColumn; });
    var tablespace   = i2b2.ExportSQL.model.tablespace;
    var statement    = i2b2.ExportSQL.getStatementObj();
    var fromYear     = i2b2.ExportSQL.model.fromYear;
    var toYear       = i2b2.ExportSQL.model.toYear;
    
    var fromDate = isNaN(fromYear) ? null : i2b2.ExportSQL.extractDate(fromYear);
    var toDate   = isNaN(toYear) ? null : i2b2.ExportSQL.extractDate(toYear);

    statement.addItemGroup(1, 0, 'ANY', 1, 1, fromDate, toDate);
    for (var i = 0; i < items.length; i++) {
	statement.addItem(items[i], 'A');
    }
    
    var tables  = statement.getTablesStringLatestGroup();
    var satzart = tables.replace(/(.*?)(SA\d\d\d)(.*)/, '$2'); 
    
    sql += 'SELECT ' + items.join(', ') + '<br>'
	+ 'FROM ' + tables + '<br>'
	+ 'WHERE [CASE] ' + satzart + '_PSID2 IN(<br>SELECT psid FROM ' + tablespace + '.temp_result<br>);';
    
    return sql;
}

/**
 *
 */
i2b2.ExportSQL.generateInConstraintForTables = function(tables) {
    return tables.map(
	function(x) { return 'SELECT psid FROM ' + i2b2.ExportSQL.model.tablespace + '.' + x; }
    ).join('<br>INTERSECT<br>');
}

/**
 * handles the processing and transformation to a SQL statement
 */
i2b2.ExportSQL.getStatementObj = function() {
    var statement = {
 	itemGroups: [],
	
 	toString: function() {
 	    var from = [];
	    var where = [];

	    for (var i = 0; i < this.itemGroups.length; i++) {
		from = from.concat(this.itemGroups[i].getTables());
		where.push(this.itemGroups[i].toString());
	    }

	    if (from.length == 0) throw 'statement.toString(): from clause is empty';
	    if (where.length == 0) throw 'statement.toString(): where clause is empty';
	    
	    return 'SELECT *<br>'
 		+ 'FROM ' + i2b2.ExportSQL.tableArrayToString(from) + '<br>'
 		+ 'WHERE ' + where.join('<br> AND ');
 	},

	/**
	 * returns generated SQL statement
	 *
	 * @return {string} SQL statement
	 */
	toString2: function() {
	    return this.itemGroups.map(
		function(x) { return x.toString2(); }
	    ).join('<br><br>');
	},
	
	getTablesStringLatestGroup: function() {
	    if (!this.getLatestItemGroup()) throw 'statement.getTablesStringLatestGroup(): no itemGroups in statement';
	    return i2b2.ExportSQL.tableArrayToString(
		this.getLatestItemGroup().getTables()
	    );
	},

 	/**
	 * adds an item to the currently newest item group
	 * 
	 * @param {string} item_key - i2b2 path
	 * @param {string} operator - i2b2 database operator
	 * @param {string} value - value the item is matched to
	 */
 	addItem: function(item_key, icon, operator, value) {
	    if (!item_key) throw 'statement.addItem(): parameter item_key is null';
	    if (!icon) throw 'statement.addItem(): parameter icon is null';
	    this.getLatestItemGroup().addItem(item_key, icon, operator, value);
 	},

	/**
	 * returns the itemGroup of itemGroups array with the highest index
	 *
	 * @return {Object} itemGroup
	 */ 
	getLatestItemGroup: function() {
	    if (this.itemGroups.length == 0)
		return null;
	    return this.itemGroups[this.itemGroups.length - 1];
	},

 	/**
	 * adds a table expression to tables array, if not already added 
	 *
	 * @param {string} table - table expression 
	 */
 	addTable: function(table) {
	    if (!table) throw 'statement.addTable(): parameter table is null';
 	    if (this.tables.indexOf(table) < 0)
 		this.tables.push(table);
 	},

 	/**
	 * starts a new item group with specified constraints
	 *
	 * @param {integer} number - number of the group
	 * @param {integer} exclude - 1 if the group is negated
	 * @param {string} timing - 
	 * @param {integer} occurences - least number of times a constraint has to be true
	 * @param {integer} accuracy - 
	 * @param {Object} dateFrom - start date for observation
	 * @param {Object} dateTo - end date for obserfation
	 */
 	addItemGroup: function(number, exclude, timing, occurences, accuracy, dateFrom, dateTo) {
	    if (!number) throw 'statement.addItemGroup(): parameter number is null';
 	    if (!occurences) throw 'statement.addItemGroup(): parameter occurences is null';
	    if (!dateFrom) throw 'statement.addItemGroup(): parameter dateFrom is null - group of a query or subquery does not contain a from-date';

	    var itemGroup = {
		number    : number,
 	     	exclude   : exclude,
		timing    : timing,
		occurences: occurences,
		accuracy  : accuracy,
		dateFrom  : dateFrom,
		dateTo    : dateTo,
 	     	items     : [],
		tables    : [],

		/**
		 * transforms the itemGroup to SQL syntax
		 *
		 * @return {string} SQL string
		 */
		toString: function() {
 	    	    var sql = this.items.map(
			function(x) { return x.toString(); }
		    ).join('<br>OR ');

		    if (this.exclude == 1)
			sql = 'NOT (' + sql + ')';
		    
		    return sql;
 	    	},

		/**
		 * returns the createstatement for the temporary table of the group, except all subqueries
		 *
		 * @return {string} create statement
		 */
		toString2: function() {
		    var tablespace = i2b2.ExportSQL.model.tablespace;

		    if (this.items.length == 0)
			return 'CREATE TEMPORARY TABLE ' + tablespace + '.' + this.getTempTableName() + '(psid integer);';

		    if (this.tables.length == 0) throw 'itemGroup.toString2(): no tables for the group available';
		    return 'CREATE TEMPORARY TABLE ' + tablespace + '.' + this.getTempTableName() + ' AS (<br>'
			+ 'SELECT CASE '
			+ this.tables.map(
			    function(x) {
				var satzartNr = x.replace(/(.*?)(SA)(\d\d\d)(.*)/, '$3');
				var satzart   = 'SA' + satzartNr;
				if (isNaN(satzartNr)) throw 'itemGroup.toString2(): tablename does not contain a satzartNr';
				return satzart + '_PSID2 IS NOT NULL THEN ' + satzart + '_PSID2';
			    }
			).join(' ELSE ') + ' ELSE NULL END AS psid<br>'
			+ 'FROM ' + i2b2.ExportSQL.tableArrayToString(this.tables)
			+ '<br>WHERE ' + this.toString() 
			+ '<br>);';
		},

		/**
		 * returns all tables of the group as array
		 *
		 * @return {Object} tables array
		 */
		getTables: function() {
		    return this.tables;
		},

		/**
		 * returns name of the temporary table
		 *
		 * @return {string} tablename
		 */
		getTempTableName: function() {
		    if (!this.number) throw 'itemGroup.getTempTableName(): number is null';
		    return 'temp_group_' + this.number;
		},

		/**
		 * generates dimdi db table names, for a given column name
		 * if there are multiple years selected for the itemGroup, 
		 * the table name gets generated for each year (connected by UNION ALL)
		 * 
		 * @param {string} dimdiColumn - valid dimdi database column name
		 * @return {Object} array with table and alias 
		 */
		getTableWithAliasForColumn: function(dimdiColumn) {
		    if (!dimdiColumn) throw 'itemGroup.getTableWithAliasForColumn(): parameter dimdiColumn is null';
		    var table = '';
		    var alias = '';

		    if (!this.dateFrom) {
			throw 'itemGroup.getTableWithAliasForColumn(): dateFrom is null';
		    } else if(this.dateFrom && this.dateTo 
			      && this.dateFrom.Year > this.dateTo.Year
			     ) {
			throw 'itemGroup.getTableWithAliasForColumn(): from-year is greater then to-year';
		    } else if (this.dateFrom 
			       && (!this.dateTo || this.dateFrom == this.dateTo)
			      ) { // missing or equal to-date
			table = this.extractTableWithTablespace(dimdiColumn, this.dateFrom.Year);
			alias = this.extractTable(dimdiColumn, this.dateFrom.Year);
		    } else { // from- and to-date given
			for (var i = this.dateFrom.Year; i <= this.dateTo.Year; i++) {
		    	    table += 'SELECT * FROM ' + this.extractTableWithTablespace(dimdiColumn, i);
			    alias += this.extractTable(dimdiColumn, i);
			    if (i < this.dateTo.Year) {
				table += ' UNION ALL ';
				alias += '_';
			    }
			}
			table = '(' + table + ')'; 
		    }
		    return new Array(table, alias);
		},

		getTableForColumn: function(dimdiColumn) {
		    if (!dimdiColumn) throw 'itemGroup.getTableForColumn(): parameter dimdiColumn is null';
		    return this.getTableWithAliasForColumn(dimdiColumn)[0];
		},

		getAliasForColumn: function(dimdiColumn) {
		    if (!dimdiColumn) throw 'itemGroup.getAliasForColumn(): parameter dimdiColumn is null';
		    return this.getTableWithAliasForColumn(dimdiColumn)[1];
		},

		/**
		 * adds a dimdi table constraint, generated by getTableForColumn()
		 * to the groups tables array
		 *
		 * @param {string} dimdiColumn - valid dimdi database column name
		 */
		addTableForColumn: function(dimdiColumn) {
		    if (!dimdiColumn) throw 'itemGroup.addTableForColumn(): parameter dmdiColumn is null';
		    var table = this.getTableWithAliasForColumn(dimdiColumn).join(' ');

		    if (this.tables.indexOf(table) < 0)
			this.tables.push(table);
		},

		/**
		 * returns the dimdi db table and tablespace, which contains the given dimdi column and year
		 *
		 * @param {string} dimdiColumn - valid column name of the dimdi database
		 * @param {integer} year - Ausgleichsjahr
		 *
		 * @return {string} table name with tablespace
		 */
 		extractTableWithTablespace: function(dimdiColumn, year) {
		    if (!dimdiColumn) throw 'itemGroup.extractTableWithTablespace(): parameter dimdiColumn is null';
		    if (!year) throw 'itemGroup.extractTableWithTablespace(): parameter year is null';
		    
 		    return i2b2.ExportSQL.model.tablespace + '.' + this.extractTable(dimdiColumn, year);
 		},

		/**
		 * returns the dimdi db table, which contains the given dimdi column and year
		 *
		 * @param {string} dimdiColumn - valid column name of the dimdi database
		 * @param {integer} year - Ausgleichsjahr
		 *
		 * @return {string} table name
		 */
		extractTable: function(dimdiColumn, year) {
		    if (!dimdiColumn) throw 'itemGroup.extractTable(): parameter dimdiColumn is null';
		    if (!year) throw 'itemGroup.extractTable(): parameter year is null';

		    var satzartNr = dimdiColumn.replace(/(SA)(\d\d\d)(.*)/, '$2');

		    if (isNaN(satzartNr)) throw 'itemGroup.extractTable(): dimdiColumn does not contain a satzartNr';

		    return 'V' + year + 'SA' + satzartNr;
		},

		/** 
		 * adds a new item to the items array
		 *
		 * @param {string} dimdiColumn - dimdi database conform column name
		 * @param {string} operator - the operator used by i2b2 to query the i2b2 database
		 * @param {string} value - the value the item is matched to
		 */
 	    	addItem: function(item_key, icon, operator, value) {
		    if (!item_key) throw 'itemGroup.addItem(): parameter item_key is null';
		    if (!icon) throw 'itemGroup.addItem(): parameter icon is null';

		    var dimdiColumn = item_key.replace(/(.*\\)(SA.*?)(\\.*)/, '$2');
 	    	    var table       = this.getTableForColumn(dimdiColumn);
		    var alias       = this.getAliasForColumn(dimdiColumn);

		    var item = {
			item_key   : item_key,
 	    		dimdiColumn: dimdiColumn,
 	    		operator   : operator,
 	    		value      : value,
			table      : table,
			alias      : alias,
			occurences : this.occurences,
			icon       : icon,

			/**
			 * transforms the item to SQL
			 *
			 * @return {string} SQL string build from dimdiColumn, operator and value
			 */
 	    		toString: function() {
			    if (!this.dimdiColumn) throw 'item.toString(): dimdiColumn is null';
			    if (!this.item_key) throw 'item.toString(): item_key is null';
			    if (!this.icon) throw 'item.toString(): icon is null';
			    if (!this.occurences) throw 'item.toString(): occurences is null';
			    if (!this.alias) throw 'item.toString(): alias is null';

			    var sql        = '';
			    var constraint = '';
			    var satzartNr  = this.dimdiColumn.replace(/(SA)(\d\d\d)(.*)/, '$2');
			    var value      = this.item_key.replace(/(.*?\\)([^\\]*?)(\\$)/, '$2');
			    var regExp     = new RegExp('(.*?' + this.dimdiColumn + '\\\\)([^\\\\]*)(\\\\.*)');
			    var catalogue  = this.item_key.replace(regExp, '$2');
			    var satzart    = 'SA' + satzartNr;

			    if (isNaN(satzartNr)) throw 'item.toString(): dimdiColumn does not contain a satzartNr';
			    
			    if (this.operator) {
 	    			constraint = this.dimdiColumn + ' ' 
				    + this.getModifiedOperator() + ' '
				    + this.getModifiedValue();
			    } else if (value != catalogue) {
				constraint = this.dimdiColumn
				    + " LIKE '" + value + (this.icon.indexOf('F') != -1 ? '%' : '') + "'";
			    } else {
				constraint = this.dimdiColumn + ' IS NOT NULL';
			    }
			    if (this.occurences > 1) {
				sql = this.occurences + ' <= '
				    + '(SELECT count(*)'
				    + ' FROM ' + this.table
				    + ' WHERE ' + constraint
				    + '       AND ' + satzart + '_PSID2 = ' + this.alias + '.' + satzart + '_PSID2'
				    + ')';
			    } else {
				sql = constraint;
			    }

			    return sql;
 	    		},

			/** 
			 * returns the operator translatet to SQL syntax
			 *
			 * @return {string} operator in SQL syntax
			 */
			getModifiedOperator: function() {
			    var operator  = this.operator.replace(/\[.*\]/, '');
			    var sqlMapper = {
				'LT'  : '<'
				, 'LE': '<='
				, 'EQ': '='
				, 'GT': '>'
				, 'GE': '>='
			    };

			    if (operator != null && sqlMapper[operator])
				return sqlMapper[operator];
			    return operator;
			},

			/** 
			 * returns the value of the item
			 * the value is modified, depending on the datatype and operator
			 *
			 * @return {string} modified value
			 */ 
			getModifiedValue: function() {
			    var operator_sufix = this.operator.replace(/(.*?\[)(.*?)(\])/, '$2');

			    switch (this.getDatatype()) {
			    case 'string':
				var value = this.value;
				if (operator_sufix == 'contains')
				    value = '%' + value + '%';
				if (operator_sufix == 'begin')
				    value += '%';
				if (operator_sufix == 'end')
				    value = '%' + value;
				// in case of 'exact': no additions needed 
				
				return value.includes("'") ? value : "'" + value + "'";
			    case 'integer':
				return this.value.replace(/'/g, '');
			    default:
				throw 'item.getModifiedValue(): no valid datatype for ' + this.dimdiColumn + ' found';
			    }
			},

			/**
			 * returns 'string' or 'integer' depending on the given dimdi db column name 
			 *
			 * @param {string} 'string' or 'integer'
			 */
			getDatatype: function() {
			    if (!this.dimdiColumn) throw 'item.getDatatype(): dimdiColumn is null';
			    var satzartNr = this.dimdiColumn.replace(/(SA)(\d\d\d)(.*)/, '$2');

			    if (isNaN(satzartNr)) throw 'item.getDatatype(): dimdiColumn does not contain a valid satzartNr';
			    if ((satzartNr == 551 || satzartNr == 651)
				&& (new RegExp('DIAGNOSE|ICD|QUALIFIZIERUNG')).test(this.dimdiColumn)
			       )
				return 'string';

			    return 'integer';
			}
 	    	    };
		    
		    this.items.push(item);
		    this.addTableForColumn(dimdiColumn);
 	    	}
 	    };
	    
 	    this.itemGroups.push(itemGroup);
 	}
    }
    
    return statement;
}


