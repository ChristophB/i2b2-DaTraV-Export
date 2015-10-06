/* this function is called after the HTML is loaded into the viewer DIV */
i2b2.ExportSQL.Init = function(loadedDiv) {
    var qmDivName      = 'ExportSQL-QMDROP';
    var conceptDivName = 'ExportSQL-IDROP';
    var op_trgt        = { dropTarget: true };
    var cfgObj         = { activeIndex: 0 };
    var endYear        = new Date().getFullYear();
    i2b2.ExportSQL.model.minStartYear = 2009;

    var counter        = 1;
    var selectFromYear = document.getElementById('fromYear');
    var selectToYear   = document.getElementById('toYear');

    /* Rework for Firefox */
    selectFromYear.options[0] = new Option('---');
    selectToYear.options[0]   = new Option('---');

    for (var year = i2b2.ExportSQL.model.minStartYear; year <= endYear; year++) {
	selectFromYear.options[counter] = new Option(year);
	selectToYear.options[counter]   = new Option(year);
	counter++;
    }

    i2b2.ExportSQL.model.tablespace = 'DATRAVEXAMPLE';
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

/* resets the plugins model data and redraws the view to initial stage */
i2b2.ExportSQL.reset = function() {
    i2b2.ExportSQL.model.concepts = [];
    i2b2.ExportSQL.model.fromYear = undefined;
    i2b2.ExportSQL.model.toYear   = undefined;
    i2b2.ExportSQL.model.qm       = undefined;

    document.getElementById('fromYear').selectedIndex = 0;
    document.getElementById('toYear').selectedIndex   = 0;
    $('ExportSQL-QMDROP').innerHTML = 'Drop a query object here';
    document.getElementById('results').hide();

    i2b2.ExportSQL.redrawConceptDiv();
    i2b2.ExportSQL.checkModel();
};

/**
 * this function is called after modifying a year value in the plugins view
 * the set or modifyied year will get added to the model data
 */
i2b2.ExportSQL.setYear = function() {
    var fromYear = document.getElementById('fromYear');
    var toYear   = document.getElementById('toYear');

    fromYear = fromYear.options[fromYear.selectedIndex].text;
    toYear   = toYear.options[toYear.selectedIndex].text;

    i2b2.ExportSQL.model.fromYear = fromYear;
    i2b2.ExportSQL.model.toYear   = toYear;

    i2b2.ExportSQL.checkModel();
};

/* redraws the message panel depending on available values in the model data */
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
};

/**
 * handles a droped query master 
 *
 * @param {Object[]} sdxData - droped sdx object
 */
i2b2.ExportSQL.doDrop = function(sdxData) {
    sdxData = sdxData[0];
    i2b2.ExportSQL.model.qm = sdxData;

    $('ExportSQL-QMDROP').innerHTML = i2b2.h.Escape(sdxData.sdxInfo.sdxDisplayName);

    i2b2.ExportSQL.checkModel();		
};

/* checks if the model data is valid and ready for an execution */
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
};

/** 
 * handles drop concepts 
 * 
 * @param {Object[]} sdxData - droped sdx object
 */
i2b2.ExportSQL.doDropConcept = function(sdxData) {
    var concept = {};
    sdxData             = sdxData[0];
    concept.dimdiColumn = sdxData.sdxInfo.sdxKeyValue.replace(/(.*?\\)(SA\d\d\d.*?)(\\$)/, '$2');
    concept.displayName = sdxData.sdxInfo.sdxDisplayName;
 
    if (!concept.dimdiColumn.match(/SA\d\d\d[^\\]*$/))
	return;
    i2b2.ExportSQL.model.concepts.push(concept);
    
    var temp = [];
    for (i = 0; i < i2b2.ExportSQL.model.concepts.length; i++) {
	if (temp.indexOf(i2b2.ExportSQL.model.concepts[i].dimdiColumn) != -1)
	    i2b2.ExportSQL.model.concepts.splice(i, 1);
	else temp.push(i2b2.ExportSQL.model.concepts[i].dimdiColumn);
    }

    i2b2.ExportSQL.redrawConceptDiv();    
    i2b2.ExportSQL.checkModel();
};

/**
 * removes an item from the concept-div
 *
 * @param {string} dimdiColumn
 */
i2b2.ExportSQL.removeItem = function(dimdiColumn) {
    var concepts = [];
    for (i = 0; i < i2b2.ExportSQL.model.concepts.length; i++) {
	var concept = i2b2.ExportSQL.model.concepts[i];
	if (concept.dimdiColumn != dimdiColumn)
	    concepts.push(concept);
    }
    i2b2.ExportSQL.model.concepts = concepts;
    i2b2.ExportSQL.redrawConceptDiv();

    i2b2.ExportSQL.checkModel();
};

i2b2.ExportSQL.redrawConceptDiv = function() {    
    var icon      = 'sdx_ONT_CONCPT_leaf.gif'; // 'sdx_ONT_CONCPT_branch-exp.gif';
    var innerHTML = i2b2.ExportSQL.model.concepts.map(
	function(x) { 
	    return '<span class="dropedItem" onclick="i2b2.ExportSQL.removeItem(\'' + x.dimdiColumn + '\')" title="' + x.dimdiColumn + '">'
		+ '<img src="js-i2b2/cells/ONT/assets/' + icon + '">'
		+ '&nbsp;&nbsp;' + x.displayName
		+ '</span>';
	}
    ).join('<br>');

    if (!innerHTML)
	innerHTML = 'Drop concepts here';
    $('ExportSQL-IDROP').innerHTML = innerHTML;
};

i2b2.ExportSQL.copyToClipboard = function() {
    var div = document.getElementById('ExportSQL-StatementBox');

    if (typeof window.getSelection != 'undefined' && typeof document.createRange != 'undefined') {
        var range = document.createRange();
        range.selectNodeContents(div);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    } else if (typeof document.selection != 'undefined' && typeof document.body.createTextRange != 'undefined') {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(div);
        textRange.select();
    }

    try {
	if (!document.execCommand('Copy'))
	    throw 'Unable to copy to clipboard';
	i2b2.ExportSQL.clearSelection();
    } catch (e) {
	alert('Unable to copy to clipboard. Please copy the selection manualy by pressing CTRL + C or CMD + C');
    }
};

i2b2.ExportSQL.clearSelection = function() {
    if ( document.selection ) {
        document.selection.empty();
    } else if ( window.getSelection ) {
        window.getSelection().removeAllRanges();
    }
};

/* refreshs the display with info of the SDX record that was DragDropped */
i2b2.ExportSQL.getResults = function() {
    if (!i2b2.ExportSQL.model.dirtyResultsData) {
	return;
    }
    var qm_id      = i2b2.ExportSQL.model.qm.sdxInfo.sdxKeyValue;
    
    try {
	var result     = i2b2.ExportSQL.processQM(qm_id);

        var tempTables = i2b2.ExportSQL.uniqueElements(
	    result[0].match(/tmp_grp_g\d+ |tmp_grp_g_sameins /g)
	);

	result[0] += '<br><br>' + i2b2.ExportSQL.processItems(tempTables);

	document.getElementById('ExportSQL-StatementBox').innerHTML = 
	    '<pre>' + result[0] + '</pre>';
	document.getElementById('results').style.display = 'block';
    } catch (e) {
    	alert(e);
    }

    i2b2.ExportSQL.model.dirtyResultsData = false;
};

/**
 * returns an array which contains all elements from the given array except duplicates
 *
 * @param {Object[]} array
 *
 * @return {Object[]} array without duplicates
 */
i2b2.ExportSQL.uniqueElements = function(array) {
    if (!array) throw 'i2b2.ExportSQL.uniqueElements(): provided array is null';

    var temp = [];
    var result = array.slice();

    for (var i = result.length - 1; i >= 0; i--) {
	if (temp.indexOf(result[i]) != -1) 
	    result.splice(i, 1);
	else temp.push(result[i]);

    }

    return result;
};

/**
 * generates "create temporary table" statements for a given QM-ID
 * this function is called recursively, if the specified query contains subqueries
 *
 * @param {integer} qm_id - ID of a querymaster
 * @param {string} outerPanelNumber - panelNumber of a panel, in which the query is embedded
 * @param {integer} outerExclude - 1 if the outer panel has "exclude" selected
 *
 * @return {Object[]} array with 1: generated SQL and 2: XML-message of the QM
 */
i2b2.ExportSQL.processQM = function(qm_id, outerPanelNumber, outerExclude) {
    var tablespace = i2b2.ExportSQL.model.tablespace;
    var msg_vals   = { qm_key_value: qm_id };
    var results    = i2b2.CRC.ajax.getRequestXml_fromQueryMasterId('Plugin:ExportSQL', msg_vals);
    var queryDef   = i2b2.h.XPath(results.refXML, 'descendant::query_name/..');
    var xmlResults = [];

    if (queryDef.length == 0) {
	throw 'processQM(): invalide query definition';
    }

    /*** Population Query ***/
    xmlResults.push(i2b2.ExportSQL.processQMXML(queryDef[0], outerPanelNumber, outerExclude));


    /*** Event Queries ***/
    var events           = i2b2.h.XPath(queryDef[0], 'descendant::subquery');
    var eventConstraints = i2b2.h.XPath(queryDef[0], 'descendant::subquery_constraint');

    for (var i = 0; i < events.length; i++) {
    	xmlResults.push(i2b2.ExportSQL.processQMXML(events[i]));
    }


    /*** Output ***/
    var output = '';
    for (var i = 0; i < xmlResults.length; i++) {
	var statement         = xmlResults[i].statement;
	var panelResultTables = xmlResults[i].panelResultTables;
	var subQuerySql       = xmlResults[i].subQuerySql;
	var eventId           = xmlResults[i].eventId;

	var sql = 
	    '/*** ' + (eventId ? eventId : 'Population') + ' ***/<br>'
	    + (subQuerySql != '' ? subQuerySql + '<br><br>' : '')
	    + statement.toString2()
	    + '<br><br>DROP TABLE ' + tablespace + '.tmp_rs' + (outerPanelNumber ? '_' + outerPanelNumber : '') + (eventId ? '_' + eventId : '') + ';<br>'
	    + 'CREATE TABLE ' + tablespace + '.tmp_rs' + (outerPanelNumber ? '_' + outerPanelNumber : '') + (eventId ? '_' + eventId : '') + ' AS (<br>';


	/*** INTERSECT expression for WHERE constraints ***/
	var sameVisitTables = [];
	var diffVisitTables = [];
	panelResultTables = i2b2.ExportSQL.uniqueElements(panelResultTables);

	if (eventId) { //current query is an event
	    sql += 'SELECT psid, ausgleichsjahr FROM ' + panelResultTables[0];
	} else {
	    for (var j = 0; j < panelResultTables.length; j++) {
		var curResultTable = panelResultTables[j];
		if (curResultTable.match(/samevisit/))
		    sameVisitTables.push(curResultTable);
		else diffVisitTables.push(curResultTable);
	    }
	    if (sameVisitTables.length > 0) {
		sql += 'SELECT psid FROM (<br>'
		    + sameVisitTables.map(
			function(x) { return 'SELECT psid, ausgleichsjahr FROM ' + x }
		    ).join('<br>INTERSECT<br>')
		    + '<br>)';
	    }
	    if (diffVisitTables.length > 0) {
		sql += (sameVisitTables.length > 0 ? '<br>INTERSECT<br>' : '')
		    + diffVisitTables.map(
			function(x) { return 'SELECT psid FROM ' + x }
		    ).join('<br>INTERSECT<br>');
	    }
	}
	sql += '<br>);';
	output += sql + '<br><br>';
    }

    /*** Event Handling ***/
    for (var i = 0; i < eventConstraints.length; i++) {
	var fistQuery    = i2b2.h.XPath(eventConstraints[i], 'descendant::first_query');
	var operator     = i2b2.h.getXNodeVal(eventConstraints[i], 'operator');
	var secoundQuery = i2b2.h.XPath(eventConstraints[i], 'descendant::secound_query');
    }


    return new Array(output, results.msgResponse);
};

/**
 *
 */
i2b2.ExportSQL.newResultObj = function(statement, panelResultTables, subQuerySql, eventId) {
    var result = {
	statement        : statement,
	panelResultTables: panelResultTables,
	subQuerySql      : subQuerySql,
	eventId          : eventId
    };
    return result;
};

/**
 *
 */
i2b2.ExportSQL.processQMXML = function(queryDef, outerPanelNumber, outerExclude) {
    var tablespace  = i2b2.ExportSQL.model.tablespace;
    var statement   = i2b2.ExportSQL.newStatementObj();
    var timing      = i2b2.h.getXNodeVal(queryDef, 'query_timing');
    var specificity = i2b2.h.getXNodeVal(queryDef, 'specificity_scale');
    var panels      = i2b2.h.XPath(queryDef, 'child::panel');
    var queryType   = i2b2.h.getXNodeVal(queryDef, 'query_type');
    var subQuerySql = '';
    var panelResultTables = [];
    var eventId;

    if (queryType && queryType == 'EVENT')
	eventId = i2b2.h.getXNodeVal(queryDef, 'query_id').replace(' ', '_');
    
    for (var pnr = 0; pnr < panels.length; pnr++) {
	var panel              = panels[pnr];
	var panelNumber        = 'g' + i2b2.h.getXNodeVal(panel, 'panel_number');
	var panelExclude       = i2b2.h.getXNodeVal(panel, 'invert');
	var panelTiming        = i2b2.h.getXNodeVal(panel, 'panel_timing') || 'ANY';
	var panelOccurences    = i2b2.h.getXNodeVal(panel, 'total_item_occurrences');
	var panelAccuracy      = i2b2.h.getXNodeVal(panel, 'panel_accuracy_scale');					
	var panelDateFrom      = i2b2.ExportSQL.extractDate(i2b2.h.getXNodeVal(panel, 'panel_date_from'));
	var panelDateTo        = i2b2.ExportSQL.extractDate(i2b2.h.getXNodeVal(panel, 'panel_date_to'));
	var panelItems         = i2b2.h.XPath(panel, 'descendant::item[item_key]');
	var subQueryCounter    = 1;

	if (!panelDateFrom) { // from date in group is null -> use selected year values
	    panelDateFrom = i2b2.ExportSQL.extractDate(i2b2.ExportSQL.model.fromYear);
	    panelDateTo   = i2b2.ExportSQL.extractDate(i2b2.ExportSQL.model.toYear);
	    // alert('Added selected year values to a query or subquery, because it had no dates asigned.');
	}
	if (panelDateFrom.Year < i2b2.ExportSQL.model.minStartYear
	    || (panelDateTo && panelDateTo.Year < i2b2.ExportSQL.model.minStartYear)
	   ) {
	    throw 'processQM(): date in a query or subquery is before ' + i2b2.ExportSQL.model.minStartYear;
	}

	if (eventId)
	    panelNumber = eventId + '_' + panelNumber;
	if (outerPanelNumber)
	    panelNumber = outerPanelNumber + '_' + panelNumber;
	if (outerExclude == 1 && panelExclude == 1)
	    panelExclude = 0;

	statement.addItemGroup(
	    panelNumber, panelExclude, panelTiming, panelOccurences, 
	    panelAccuracy, panelDateFrom, panelDateTo
	);

	for (var itemNum = 0; itemNum < panelItems.length; itemNum++) {
	    var item       = panelItems[itemNum];
	    var item_key   = i2b2.h.getXNodeVal(item, 'item_key');
	    var item_icon  = i2b2.h.getXNodeVal(item, 'item_icon');
	    var constraint = i2b2.h.XPath(item, 'descendant::constrain_by_value');
	    var modifier   = i2b2.h.XPath(item, 'descendant::constrain_by_modifier');
	    var operator   = undefined;
	    var value      = undefined;

	    if (!item_key.match(/SA/) && !item_key.match(/masterid:/) && !modifier)
		throw 'processQM(): the QM contains a non-supported query or subquery';

	    if (modifier[0]) {
		item_key   = i2b2.h.getXNodeVal(modifier[0], 'modifier_key');
		constraint = i2b2.h.XPath(modifier[0], 'descendant::constrain_by_value');
	    }

	    if (constraint[0]) {
		operator = i2b2.h.getXNodeVal(constraint[0], 'value_operator');
		value    = i2b2.h.getXNodeVal(constraint[0], 'value_constraint');
	    }
	    
	    /*** item is querymaster ***/
	    if (item_key.match(/masterid:/)) {
		var masterid = item_key.replace('masterid:', '');
		subQuerySql += i2b2.ExportSQL.processQM(
		    masterid
		    , panelNumber + '_q' + subQueryCounter
		    , panelExclude
		)[0];

		statement.addSubQueryTable(tablespace + '.tmp_rs_' + panelNumber + '_q' + subQueryCounter);
		subQueryCounter++;
		continue;
	    }
	    statement.addItem(item_key, item_icon, operator, value);
	}

	switch (panelTiming) {
	case 'SAMEINSTANCENUM':
	    var tempPanelNumber = panelNumber.replace(/\d*$/, '');
	    panelResultTables.push(tablespace + '.tmp_grp_' + tempPanelNumber + '_sameins');
	    break;
	case 'SAMEVISIT':
	    panelResultTables.push(tablespace + '.tmp_grp_' + panelNumber + '_samevisit');
	    break;
	default:
	    panelResultTables.push(tablespace + '.tmp_grp_' + panelNumber);
	}
    }

    return i2b2.ExportSQL.newResultObj(statement, panelResultTables, subQuerySql, eventId);
};

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
    if (string && string.match(/\d/)) {
	string = string.replace('Z','');
	string = string.split('-');

	date.Year  = string[0];
	date.Month = string[1];
	date.Day   = string[2];
	
	return date;
    } else {
	return null;
    }
};

/**
 * transformes an array of table expressions to a string
 * joins are realised as FULL (OUTER) JOIN
 *
 * @param {Object} array - array of table expressions
 *
 * @return {string} SQL
 */
i2b2.ExportSQL.tableArrayToString = function(array) {
    var sql         = '';
    var prevSatzart = '';
    var satzarten   = [];
    var spaces      = Array(6).join('&nbsp;');

    for (var i = 0; i < array.length; i++) {
	var curSatzart = String(array[i]).replace(/(.*?)(SA\d\d\d)(.*)/, '$2');
	
	if (i > 0) {
	    sql += '<br>' + spaces + 'FULL JOIN<br>' 
		+ spaces +  array[i] + '<br>'
		+ spaces + 'ON (' + i2b2.ExportSQL.generateCaseString(satzarten, new Array('PSID', 'PSID2')) 
		+ ' = ' + i2b2.ExportSQL.generateCaseString(new Array(curSatzart), new Array('PSID', 'PSID2')) 
		+ '<br>' + spaces + Array(5).join('&nbsp;') + 'AND ' 
		+ i2b2.ExportSQL.generateCaseString(satzarten, new Array('AUSGLEICHSJAHR')) + ' = ' + curSatzart + '_AUSGLEICHSJAHR'
		+ ')';
	} else {
	    sql += array[i];
	}
	prevSatzart = curSatzart;
	satzarten.push(curSatzart);
    }

    if (array.length > 1) sql = '(' + sql + ')';

    return sql;
};

/**
 * generates a SQL CASE expression for a given set of Satzarten, expanded by a sufix
 * there are some exceptions for the combination SA999 + PSID2 and SA951 + BERICHTSJAHR
 *
 * @param {Object[]} satzarten - array of Satzarten
 * @param {Object[]} sufix - first element is sufix of normal column, following: columns concatenated with AUSGLEICHSJAHR
 * @param {string} alias - alias for the CASE expression (optional)
 + @param {string} outerAlias - alias of the outer querys from-tables (optional)
 *
 * @return {string} SQL CASE expression
 */
i2b2.ExportSQL.generateCaseString = function(satzarten, sufix, alias, outerAlias) {
    var sql        = '';
    var satzarten  = satzarten.slice();
    var outerAlias = outerAlias ? outerAlias + '.' : '';
    var alias      = alias ? ' AS ' + alias : '';

    if (!satzarten || !sufix) return '';
    if (sufix[0].match(/PSID2/) && satzarten.indexOf('SA999') != -1)
	satzarten.splice(satzarten.indexOf('SA999'), 1);
    if (sufix[0].match(/BERICHTSJAHR/) && satzarten.indexOf('SA951') != -1)
	satzarten.splice(satzarten.indexOf('SA951'), 1);
    if (satzarten.length == 1 && satzarten[0].match(/SA999/) && sufix.indexOf('PSID2') != -1)
	sufix.splice(sufix.indexOf('PSID2'), 1);
    if (satzarten.length == 1 && satzarten[0].match(/SA951/) && sufix.indexOf('BERICHTSJAHR') != -1)
	sufix.splice(sufix.indexOf('BERICHTSJAHR'), 1);
    
    if (sufix.length == 0 || satzarten.length == 0) return '';
    if (satzarten.length == 1 && sufix.length == 1)
	return outerAlias + satzarten[0] + '_' + sufix + alias;

    for (var o = 0; o < sufix.length; o++) { 
	for (var i = 0; i < satzarten.length; i++) {
	    if (sufix[o].match(/PSID2/) && satzarten[i].match(/SA999/)) continue;
	    if (sufix[o].match(/BERICHSTJAHR/) && satzarten[i].match(/SA951/)) continue;
	    sql += ' WHEN ' + outerAlias + satzarten[i] + '_' + sufix[o] + ' IS NOT NULL THEN '
		+ (o > 0 ? outerAlias + satzarten[i] + "_AUSGLEICHSJAHR || '_' || " : '')
		+ outerAlias + satzarten[i] + '_' + sufix[o];
	}
    }
    if (sql == '') return '';
    return 'CASE' + sql + ' ELSE NULL END' + alias;
};

/**
 * creates the final SELECT statement
 *
 * @param {Object} tempTables - array of all created temporary tables
 * @param {Object} items - array of all selected items, by user
 *
 * @return {string} select statement
 */
i2b2.ExportSQL.processItems = function(tempTables) {
    var inConstraint       = i2b2.ExportSQL.generateInConstraintForTables(tempTables);
    var items              = i2b2.ExportSQL.model.concepts.map(function(x) { return x.dimdiColumn; });
    var tablespace         = i2b2.ExportSQL.model.tablespace;
    var statement          = i2b2.ExportSQL.newStatementObj();
    var fromDate           = i2b2.ExportSQL.extractDate(i2b2.ExportSQL.model.fromYear);
    var toDate             = i2b2.ExportSQL.extractDate(i2b2.ExportSQL.model.toYear);

    statement.addItemGroup(1, 0, 'ANY', 1, 1, fromDate, toDate);
    
    var satzarten = [];
    for (var i = 0; i < items.length; i++) {
	statement.addItem(items[i], 'LA');
	satzarten.push(items[i].replace(/(SA\d\d\d)(.*)/, '$1'));
    }
    satzarten = i2b2.ExportSQL.uniqueElements(satzarten);

    var psidCase           = i2b2.ExportSQL.generateCaseString(satzarten, new Array('PSID', 'PSID2'), 'psid');
    var ausgleichsjahrCase = i2b2.ExportSQL.generateCaseString(satzarten, new Array('AUSGLEICHSJAHR'), 'ausgleichsjahr');
    var berichtsjahrCase   = i2b2.ExportSQL.generateCaseString(satzarten, new Array('BERICHTSJAHR'), 'berichtsjahr');
    var psid2Case          = i2b2.ExportSQL.generateCaseString(satzarten, new Array('PSID2'), 'psid2');
    var spaces             = Array(8).join('&nbsp;');
    
    return '/*** Final Select ***/<br>'
	+ 'SELECT ' + psidCase + ',<br>' 
	+       spaces + ausgleichsjahrCase + ',<br>'
	+       (berichtsjahrCase == '' ? '' : spaces + berichtsjahrCase + ',<br>')
	+       (psid2Case == '' ? '' : spaces + psid2Case + ',<br>')
	+       spaces + items.join(', ') + '<br>'
	+ 'FROM ' + statement.getTablesStringLatestGroup() + '<br>'
	+ 'WHERE ' + i2b2.ExportSQL.generateCaseString(satzarten, new Array('PSID', 'PSID2')) 
	+       ' IN(<br>' + Array(7).join('&nbsp;') + 'SELECT psid FROM ' + tablespace + '.tmp_rs WHERE psid IS NOT NULL)<br>'
	+ 'ORDER BY 1, 2, 3;';
};

/**
 * returns an intersection of all tables (included in the given array) as string
 *
 * @param {Object} array with the tables
 *
 * @return {string} intersection of the tables
 */
i2b2.ExportSQL.generateInConstraintForTables = function(tables) {
    if (!tables) throw 'generateInConstraintForTables(): tables is null';
    return tables.map(
	function(x) { return 'SELECT psid FROM ' + i2b2.ExportSQL.model.tablespace + '.' + x; }
    ).join('<br>INTERSECT<br>');
};

i2b2.ExportSQL.addLeadingZeros = function(num, size) {
    var string = '00' + num;
    return string.substr(string.length - size);
};

/**
 * handles the processing and transformation to a SQL statement
 */
i2b2.ExportSQL.newStatementObj = function() {
    var statement = {
 	itemGroups: [],

	/**
	 * returns generated SQL statement
	 *
	 * @return {string} SQL statement
	 */
	toString2: function() {
	    var sql = [];
	    var mergedSameInstances = this.mergeSqlForItemGroupsWithSameInstanceNum();

	    if (mergedSameInstances) sql.push(mergedSameInstances);

	    for (var i = 0; i < this.itemGroups.length; i++) {
		if (this.itemGroups[i].getTiming() != 'SAMEINSTANCENUM')
		    sql.push(this.itemGroups[i].toString2());
	    }
	    return sql.join('<br><br>');
	},

	/**
	 * generates a string based on the tables of the newest item group
	 *
	 * @return {string} tables contatenated to a from clause
	 */
	getTablesStringLatestGroup: function() {
	    if (!this.getLatestItemGroup())
		throw 'statement.getTablesStringLatestGroup(): no itemGroups in statement';
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
	 * adds a subquerys resulttablename to an item group
	 *
	 * @param {string} tablename - resulttablename of the subquery
	 */
	addSubQueryTable: function(tablename) {
	    if (!tablename) throw 'statement.addSubQueryTable(): parameter tablename is null';
	    this.getLatestItemGroup().addSubQueryTable(tablename);
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
	 * merges sql of all item groups with timing set to "SAMEINSTANCENUM"
	 */
	mergeSqlForItemGroupsWithSameInstanceNum: function() {
	    var relevantGroups = [];
	    var tables         = [];
	    var satzarten      = [];
	    var fromYear, toYear;

	    for (var i = 0; i < this.itemGroups.length; i++) {
		var itemGroup = this.itemGroups[i];
		if (itemGroup.getTiming() != 'SAMEINSTANCENUM')
		    continue;
		relevantGroups.push(itemGroup);

		for (var j = 0; j < itemGroup.getTables().length; j ++) {
		    satzarten = satzarten.concat(
			itemGroup.getTables()[j].match(/SA\d\d\d/)
		    );
		}

		if (!fromYear || fromYear < itemGroup.getFromYear())
		    fromYear = itemGroup.getFromYear();
		if (!toYear || toYear > itemGroup.getToYear())
		    toYear = itemGroup.getToYear();
	    }

	    if (relevantGroups.length == 0) return;

	    /*** generate tablename ***/
	    var tableName = 
		i2b2.ExportSQL.model.tablespace + '.'
		+ relevantGroups[0].getTempTableName().replace(/\d*$/, '')
		+ '_sameins';

	    /*** generate from clause ***/
	    var fromDate = {};
	    var toDate   = {};
	    var tables   = [];

	    if (!fromYear || (toYear && fromYear > toYear))
		throw 'statement.mergeSqlForItemGroupsWithSameInstanceNum(): Year values of panels with SAMEINSTANCENUM set are not compatible';

	    satzarten = i2b2.ExportSQL.uniqueElements(satzarten);

	    for (var i = 0; i < satzarten.length; i++) {
		fromDate.Year = fromYear;
		toDate.Year   = toYear;
		tables.push(
		    relevantGroups[0].getTableWithAliasForColumn(
			satzarten[i]
			, (fromDate.Year ? fromDate : null)
			, (toDate.Year ? toDate : null)
		    )[0]
		);
	    }

	    /*** generate where constraints ***/
	    var whereConstraints = '(' 
		+ relevantGroups.map(
		    function(x) { return x.constraintsToString(); }
		).join('<br>' + Array(7).join('&nbsp;') + ') AND (<br>' + Array(7).join('&nbsp;'))
		+ ')';
	    
	    return 'DROP TABLE ' + tableName + ';<br>'
		+ 'CREATE TABLE ' + tableName + ' AS (<br>'
		+ 'SELECT ' + i2b2.ExportSQL.generateCaseString(satzarten, new Array('PSID', 'PSID2'), 'psid,') + '<br>'
		+             i2b2.ExportSQL.generateCaseString(satzarten, new Array('AUSGLEICHSJAHR'), 'ausgleichsjahr') + '<br>'
		+ 'FROM (SELECT * FROM ' + i2b2.ExportSQL.tableArrayToString(tables) + ') q<br>'
		+ 'WHERE ' + whereConstraints + '<br>'
		+ ');';
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
	    if (dateFrom.Year < i2b2.ExportSQL.model.minStartYear
		|| (dateTo && dateTo.Year < i2b2.ExportSQL.model.minStartYear)
	       ) {
		throw 'statement.addItemGroup(): dateFrom or dateTo is before ' + i2b2.ExportSQL.model.minStartYear;
	    }

	    var itemGroup = {
		number        : number,
 	     	exclude       : exclude,
		timing        : timing,
		occurences    : occurences,
		accuracy      : accuracy,
		dateFrom      : dateFrom,
		dateTo        : dateTo,
 	     	items         : [],
		tables        : [],
		subQueryTables: [],

		/**
		 * transforms the itemGroup to SQL syntax
		 *
		 * @return {string} SQL string
		 */
		constraintsToString: function() {
 	    	    var sql = this.items.map(
			function(x) { return x.toString(); }
		    ).join('<br>' + Array(7).join('&nbsp;') + 'OR ');
		    
		    var satzarten = this.getSatzarten();

		    if (this.subQueryTables.length > 0) {
			
			sql += (sql ? '<br>' + Array(7).join('&nbsp;') + 'OR ' : '')
			    + this.subQueryTables.map(
			    function(x) {
				return i2b2.ExportSQL.generateCaseString(satzarten, new Array('PSID', 'PSID2')) + ' IN (SELECT psid FROM ' + x + ')';
			    }
			).join('<br>' + Array(7).join('&nbsp;') + 'OR ');
		    }

		    if (this.occurences > 1) {
			var caseStringPsid1 = i2b2.ExportSQL.generateCaseString(satzarten, new Array('PSID', 'PSID2'));
			var caseStringPsid2 = i2b2.ExportSQL.generateCaseString(satzarten, new Array('q.PSID', 'q.PSID2'), null, 'q');
			var caseStringAusg1 = i2b2.ExportSQL.generateCaseString(satzarten, new Array('AUSGLEICHSJAHR'));
			var caseStringAusg2 = i2b2.ExportSQL.generateCaseString(satzarten, new Array('AUSGLEICHSJAHR'), null, 'q');

			sql = this.occurences + ' <=<br>'
			    + Array(7).join('&nbsp;') + '(SELECT count(*)<br>'
			    + Array(8).join('&nbsp;') + 'FROM ' + i2b2.ExportSQL.tableArrayToString(this.tables) + '<br>'
			    + Array(8).join('&nbsp;') + 'WHERE (<br>' 
			    + Array(8).join('&nbsp;') +        sql + ')<br>'
			    + Array(8).join('&nbsp;') +        'AND ' + caseStringPsid1 + ' = ' + caseStringPsid2 + '<br>'
			    + Array(8).join('&nbsp;') +        'AND ' + caseStringAusg1 + ' = ' + caseStringAusg2 + '<br>'
			    + Array(7).join('&nbsp;') + ')';
		    }

		    if (this.exclude == 1)
			sql = 'NOT (' + sql + ')';
		    
		    return sql;
 	    	},

		/**
		 * returns the createstatement for the temporary table of the group
		 *
		 * @return {string} create statement
		 */
		toString2: function() {
		    var tablespace = i2b2.ExportSQL.model.tablespace;
		    var satzarten  = this.getSatzarten();

		    if (this.tables.length == 0 && this.subQueryTables.length == 0)
			throw 'itemGroup.toString2(): no data for the group available';
		    
		    if (this.items.length == 0 && this.subQueryTables.length > 0) {
			return 'DROP TABLE ' + tablespace + '.' + this.getTempTableName() + ';<br>'
			    + 'CREATE TABLE ' + tablespace + '.' + this.getTempTableName() + ' AS (<br>'
			    + this.subQueryTables.map(
				function(x) { return 'SELECT psid, ausgleichsjahr FROM ' + x; }
			    ).join('<br>UNION<br>')
			    + '<br>);';
		    }
		    
		    return 'DROP TABLE ' + tablespace + '.' + this.getTempTableName() + ';<br>'
			+ 'CREATE TABLE ' + tablespace + '.' + this.getTempTableName() + ' AS (<br>'
			+ 'SELECT ' + i2b2.ExportSQL.generateCaseString(satzarten, new Array('PSID', 'PSID2'), 'psid') + ',<br>' 
			+ Array(8).join('&nbsp;') + i2b2.ExportSQL.generateCaseString(satzarten, new Array('AUSGLEICHSJAHR'), 'ausgleichsjahr') + '<br>'
			+ 'FROM (SELECT * FROM ' + i2b2.ExportSQL.tableArrayToString(this.tables) + ') q<br>'
			+ 'WHERE ' + this.constraintsToString() + '<br>);';
		},

		/**
		 * returns an array of used satzarten
		 *
		 * @return {Object[]} array of satzarten
		 */
		getSatzarten: function() {
		    return this.tables.map(
			function(x) {
			    var satzartNr = x.replace(/(.*?)(SA)(\d\d\d)(.*)/, '$3');
			    if (isNaN(satzartNr)) 
				throw 'itemGroup.toString2(): tablename does not contain a satzartNr';
			    return 'SA' + satzartNr;
			}
		    );
		},

		/**
		 * returns the timing value of this item group
		 *
		 * @return {string} timing
		 */
		getTiming: function() {
		    return this.timing;
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
		 * returns year value of dateFrom
		 *
		 * @return {integer} fromYear
		 */
		getFromYear: function() {
		    if (!this.dateFrom) return null;
		    return this.dateFrom.Year;
		},

		/**
		 * returns year value of dateTo
		 *
		 * @return {integer} toYear
		 */
		getToYear: function() {
		    if (!this.dateTo) return null;
		    return this.dateTo.Year;
		},

		/**
		 * returns name of the temporary table
		 *
		 * @return {string} tablename
		 */
		getTempTableName: function() {
		    if (!this.number) throw 'itemGroup.getTempTableName(): number is null';
		    return 'tmp_grp_' + this.number + (this.timing == 'SAMEVISIT' ? '_samevisit' : '');
		},

		/**
		 * generates dimdi db table names, for a given column name
		 * if there are multiple years selected for the itemGroup, 
		 * the table name gets generated for each year (connected by UNION ALL)
		 * 
		 * @param {string} dimdiColumn - valid dimdi database column name
		 * @param {integer} dateFrom
		 * @param {integer} dateTo
		 * @return {Object} array with table and alias
		 */
		getTableWithAliasForColumn: function(dimdiColumn, dateFrom, dateTo) {
		    if (!dimdiColumn) throw 'itemGroup.getTableWithAliasForColumn(): parameter dimdiColumn is null';
		    var table = '';
		    var alias = '';

		    if (!dateFrom) {
			throw 'itemGroup.getTableWithAliasForColumn(): dateFrom is null';
		    } else if(dateFrom && dateTo 
			      && dateFrom.Year > dateTo.Year
			     ) {
			throw 'itemGroup.getTableWithAliasForColumn(): from-year is greater then to-year';
		    } else if (dateFrom 
			       && (!dateTo || dateFrom == dateTo)
			      ) { // missing or equal to-date
			table = this.extractTableWithTablespace(dimdiColumn, dateFrom.Year);
			alias = this.extractTable(dimdiColumn, dateFrom.Year);
		    } else { // from- and to-date given
			for (var i = dateFrom.Year; i <= dateTo.Year; i++) {
		    	    table += 'SELECT * FROM ' + this.extractTableWithTablespace(dimdiColumn, i);
			    alias += this.extractTable(dimdiColumn, i);
			    if (i < dateTo.Year) {
				table += ' UNION ALL ';
				alias += '_';
			    }
			}
			alias = 'V' + dateFrom.Year + '_' + this.extractTable(dimdiColumn, dateTo.Year);
			table = '(' + table + ')'; 
		    }
		    return new Array(table, alias);
		},

		getTableForColumn: function(dimdiColumn) {
		    if (!dimdiColumn) throw 'itemGroup.getTableForColumn(): parameter dimdiColumn is null';
		    return this.getTableWithAliasForColumn(dimdiColumn, this.dateFrom, this.dateTo)[0];
		},

		getAliasForColumn: function(dimdiColumn) {
		    if (!dimdiColumn) throw 'itemGroup.getAliasForColumn(): parameter dimdiColumn is null';
		    return this.getTableWithAliasForColumn(dimdiColumn, this.dateFrom, this.dateTo)[1];
		},

		/**
		 * adds a dimdi table constraint, generated by getTableForColumn()
		 * to the groups tables array
		 *
		 * @param {string} dimdiColumn - valid dimdi database column name
		 */
		addTableForColumn: function(dimdiColumn) {
		    if (!dimdiColumn) throw 'itemGroup.addTableForColumn(): parameter dmdiColumn is null';
		    var table = this.getTableForColumn(dimdiColumn);

		    if (this.tables.indexOf(table) < 0)
			this.tables.push(table);
		},

		/**
		 * adds a subquerys resulttablename to the itemGroup
		 *
		 * @param {string} tablename - name of the resulttable
		 */
		addSubQueryTable: function(tablename) {
		    if (!tablename) throw 'itemGroup.addSubQueryTable(): parameter tablename is null';
		    this.subQueryTables.push(tablename);
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
			icon       : icon,

			generateBSNRConstraint: function(catalogue, value) {
			    if (value == catalogue) // toplevel
				return this.dimdiColumn + ' IS NOT NULL';
			    else if (value.match(/^\d*_\d*$/)) { // folder containins leafs for east and west BSNR
				return this.dimdiColumn
				    + ' IN (' + value.split('_').filter(
					function(x) { return x; }
				    ).map(
					function(x) { return parseInt(x) }
				    ).join(', ') + ')';
			    } else if (value.math(/^\d*$/)) { // leaf
				return this.dimdiColumn + ' = ' + parseInt(value);
			    } else // no leafs in the folder
				throw 'item.generateBSNRConstraint() for folder not yet implemented';
			},

			generatePZNConstraint: function(catalogue, value) {
			    if (value == catalogue) // toplevel
				return this.dimdiColumn + ' IS NOT NULL';
			    else // leaf
				return this.dimdiColumn + ' = ' + parseInt(value);
			    /* no special handlings for folders needed, because they are non-selectable containers */
			},

			generateAGSConstraint: function(catalogue, value) {
			    if (value == catalogue) // toplevel
				return this.dimdiColumn + ' IS NOT NULL';
			    else { // folder or leaf
				return 'CAST (' + this.dimdiColumn + ' AS Varchar(5))'
				    + " LIKE '" + parseInt(value) + "%'";
			    }
			},

			generateICD10GMConstraint: function(catalogue, value) {
			    if (value == catalogue) // toplevel
				return this.dimdiColumn + ' IS NOT NULL';
			    else if (!value.match(/\d/)) { // upper class without codes
				return this.dimdiColumn + ' IN (SELECT CODE '
				    + 'FROM ' + i2b2.ExportSQL.model.tablespace + '.ICDCODES ' 
				    + "WHERE KAPNR = '" + value + "')";
			    } else if (value.match(/-/)) { // range of codes
				var codes      = value.split('-');
				var initial    = value.substring(0, 1);
				var start      = parseInt(codes[0].substring(1, 3));
				var end        = parseInt(codes[1].substring(1, 3));

				return this.dimdiColumn + " LIKE '" + initial + "%' "
				    + 'AND TO_NUMBER(SUBSTR(' + this.dimdiColumn + ', 2, 2)) BETWEEN ' + start + ' AND ' + end; 
			    } else { // single code group with decimal places or leaf
				return this.dimdiColumn + " LIKE '" + value + "%'"; // % because of optional special characters
			    }
			},

			/**
			 * ### declare new catalogue functions here ###
			 * generates a constraint for a catalogue by executing the matching function
			 *
			 * @param {string} catalogue - name of the catalogue
			 * @param {string} value - items value
			 *
			 * @return {string} constraint for catalogue
			 */
			generateCatalogueConstraint: function(catalogue, value) {
			    switch (catalogue) {
			    case 'ICD-10-GM': return this.generateICD10GMConstraint(catalogue, value);
			    case 'AGS'      : return this.generateAGSConstraint(catalogue, value);
			    case 'BSNR'     : return this.generateBSNRConstraint(catalogue, value);
			    case 'PZN'      : return this.generatePZNConstraint(catalogue, value);
			    default         : throw 'item.toString(): ' + catalogue + ' in query or subquery is not yet supported';
			    }
			},

			/**
			 * transforms the item to SQL
			 *
			 * @return {string} SQL string build from dimdiColumn, operator and value
			 */
 	    		toString: function() {
			    if (!this.dimdiColumn) throw 'item.toString(): dimdiColumn is null';
			    if (!this.item_key) throw 'item.toString(): item_key is null';
			    if (!this.icon) throw 'item.toString(): icon is null';

			    var sql        = '';
			    var constraint = '';
			    var satzartNr  = this.dimdiColumn.replace(/(SA)(\d\d\d)(.*)/, '$2');
			    var regExp     = new RegExp('(.*?' + this.dimdiColumn + '\\\\)([^\\\\]*)(\\\\.*)');
			    var catalogue  = this.item_key.replace(regExp, '$2');
			    var satzart    = 'SA' + satzartNr;
			    var value      = this.item_key.replace(/(.*?\\)([^\\]*?)(\\$)/, '$2');

			    if (isNaN(satzartNr)) throw 'item.toString(): dimdiColumn does not contain a satzartNr';

			    if (value != this.dimdiColumn) // catalogue
				constraint = this.generateCatalogueConstraint(catalogue, value);
			    else { // non-catalogue
 	    			constraint =
				    this.dimdiColumn + ' ' 
				    + this.getModifiedOperator() + ' '
				    + this.getModifiedValue();
			    }

			    return constraint;
 	    		},

			/** 
			 * returns the operator translatet to SQL syntax
			 *
			 * @return {string} operator in SQL syntax
			 */
			getModifiedOperator: function() {
			    if (!this.operator) return 'IS NOT NULL';
			    var operator  = this.operator.replace(/\[.*\]/, '');
			    var sqlMapper = {
				'LT'  : '<'
				, 'LE': '<='
				, 'EQ': '='
				, 'GT': '>'
				, 'GE': '>='
			    };

			    if (operator && sqlMapper[operator])
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
			    if (!this.operator) return '';
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
				&& this.dimdiColumn.match(/DIAGNOSE|ICD|QUALIFIZIERUNG/)
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
    };
    
    return statement;
};


