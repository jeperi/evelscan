// This file is required by the eve.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

$( document ).ready(function() {

  const remote = require('electron').remote;
  const clipboardy = require('clipboardy');
  const LRU = require("lru-cache");
  const shell = require('electron').shell;
  //var fs = require('fs');
  //var packageData = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  packageData = require('./package.json');
  const version = packageData.version;
  console.log("Version", version);

  // Fix the margins
  function fixMargins() {
    console.log("fixMargins");
    var contentPlacement = $('#header').position().top + $('#header').height();
    $('#wrapper').css('margin-top',contentPlacement);
    $('#wrapper').css('padding-bottom',contentPlacement);
  }; fixMargins();

  $(document).on('click', 'a[href^="http"]', function(event) {
        event.preventDefault();
        shell.openExternal(this.href);
  });

  // Application state  ////////////////////////////////////////////////////////////////

  var a = {};
  a.forceOnTop = false;
  a.triggerMode = "shortcut";
  a.lastInput = "";
  a.charData = [];
  a.loading = true;
  a.loadingText = "Loading..";
  a.characterName = '';
  a.message = "";
  a.scanning = false;
  a.blanked = true;

  var aMethods = {};

  // API //////////////////////////////////////////////////////////////////////////////


  const apiThrottle = 2500;
  const apiRetry = 5000;
  const apiTimeout = 10000;
  const apiDelay = 1000;
  const apiHeaders = {"LSCAN-Version": version};

  var apiURL = "http://51.15.49.79/public";

  var cacheOptions = { max: 2000, maxAge: 1000*60*10 }; // Cache everything for 10 minutes
  const cache = LRU(cacheOptions);

  var apiManager = (function() {

    var requests = [];
    var timeout;
    var done = true;
    var complete;


    function run() {
      var self = this;
      var origComplete;

      if (requests.length) {
        done = false;
        var origComplete = requests[0].complete;
        requests[0].complete = function() {
          if (typeof(origComplete) === 'function') origComplete();
          requests.shift();
          $('#characterProgressbar').progress('increment');
          run.apply(self, []);
        };
        $.ajax(requests[0]);
      } else {
        if (!done) {
          setTimeout(function() {$('#characterProgressbar').slideUp()}, 1000);
          if (typeof(complete) === 'function') complete();
        }
        done = true;
        timeout = setTimeout(function() {
          run.apply(self, []);
        }, apiDelay);
      }
    }

    return {
      addRequest: function(options) {
        requests.push(options);
      },
      removeRequest: function(options) {
        if ( $.inArray(options, requests) > -1) {
          requests.splice($.inArray(options, requests), 1);
        }
      },
      clear: function() {
        requests.length = 0;
        requests = [];
      },
      start: function(callback) {
        $("#characterProgressbar").slideDown().progress({ total: requests.length });
        console.log("Starting api requests", requests.length);
        done = false;
        complete = callback;
        run();
      },
      stop: function() {
        requests.length = 0;
        requests = [];
        done = true;
        clearTimeout(timeout);
      }
    }
  }());


  // CharacterGrid //////////////////////////////////////////////////////////////////////////////

  var charManager = (function(charData) {

    var grid;
    var gridColumns =
    [
      { id: "name", name: "Name", field: "name", width: 100, minWidth: 90, sortable: true},
      { id: "characterAgeYears", name: "Age", field: "characterAgeYears", width: 10, minWidth: 20, sortable: true, toolTip: "Character's age in years." },
      { id: "securityStatus", name: "Sec", field: "securityStatus", width: 10, minWidth: 20, sortable: true, toolTip: "Character's security status." },
      { id: "corporation_name", name: "Corp", field: "corporation_name", width: 100, minWidth: 20, sortable: true, toolTip: "Name of the corporation the character is in." },
      { id: "alliance_name", name: "Alliance", field: "alliance_name", width: 100, minWidth: 20, sortable: true , toolTip: "Name of the alliance the character is in."},
      { id: "shipsDestroyed", name: "K", field: "shipsDestroyed", width: 10, minWidth: 20, sortable: true, toolTip: "Number of destroyed ships." },
      { id: "shipsLost", name: "D", field: "shipsLost", width: 10, minWidth: 20, sortable: true , toolTip: "Number of how many ships the character has lost."},
      { id: "KD", name: "K/D", field: "KD", width: 10, minWidth: 20, sortable: true , toolTip: "Kill/death ratio."},
      { id: "soloKills", name: "S", field: "soloKills", width: 10, minWidth: 20, sortable: true , toolTip: "Number of how many ships the character has destroyed solo."},
    ];

    var gridOptions = { enableCellNavigation: false, enableColumnReorder: true, rowHeight: 18 };
    var indices = []; var indicesGenerated = false; var currentSortCol; var isAsc = true; var sorted = false;

    function clearIndices() {
      gridColumns.forEach(function(column) {
        var key = column.id;
        if (indices[key] != undefined) indices[key].length = 0;
      });
    }
    function generateIndices() {
      clearIndices();
      var columnCount = 0;
      gridColumns.forEach(function(column) {
        var key = column.id;
        var arrayLength = charData.length;
        if (!(key in indices)) indices[key] = new Array(arrayLength);
        for (var i = 0; i < arrayLength; i++) indices[key][i] = i;
        indices[key].sort(function (x, y) {
          if (!(key in charData[x]) || !(key in charData[y])) return false;
          return charData[x][key] < charData[y][key] ? -1 : charData[x][key] > charData[y][key] ? 1 : 0;
        });
        columnCount++;
        if (columnCount === gridColumns.length && i === arrayLength) indicesGenerated = true;
      });
    }

    function updateCounters() {
      var corporations = {};
      var alliances = {};
      for (var i = 0; i < charData.length; i++) {
        if (!(charData[i].corporation_id in corporations)) corporations[charData[i].corporation_id] = 1;
        else corporations[charData[i].corporation_id] = corporations[charData[i].corporation_id] + 1;
      }
      for (var i = 0; i < charData.length; i++) { charData[i].corporation_name = "(" + corporations[charData[i].corporation_id] + ") " + charData[i].corporation_name; }
      for (var i = 0; i < charData.length; i++) {
        if (!(charData[i].alliance_id in alliances)) alliances[charData[i].alliance_id] = 1;
        else alliances[charData[i].alliance_id] = alliances[charData[i].alliance_id] + 1;
      }
      for (var i = 0; i < charData.length; i++) { charData[i].alliance_name = "(" + alliances[charData[i].alliance_id] + ") " + charData[i].alliance_name; }
      grid.invalidateAllRows();
      grid.render();

    }

    function add(data) { charData.push(data); grid.resizeCanvas(); grid.render(); indicesGenerated = false; }
    function clear()   { grid.invalidateAllRows(); indices.length = 0; charData.length = 0; indicesGenerated = false; }
    function scrollDown() { var win = $(".slick-viewport"); var height = win[0].scrollHeight; win.scrollTop(height*2); }
    function scrollUp() { var win = $(".slick-viewport"); win.scrollTop(0); }
    function autosize() { if (grid != undefined) { grid.resizeCanvas(); grid.autosizeColumns(); } };
    function getItem(index) { if (!indicesGenerated || !sorted) { return charData[index]; } return isAsc ? charData[indices[currentSortCol.field][index]] : charData[indices[currentSortCol.field][(charData.length - 1) - index]]; }
    function getLength() { return charData.length; }

    function highlighter() {
      var colored = [];
      var currentlySelected = undefined;
      var needsCleaning = false;
      grid.onMouseEnter.subscribe(function (e) {
        currentlySelected = grid.getCellFromEvent(e);
        var selected = currentlySelected;

        var wait = function(selected) {
          setTimeout(function() {
            if (currentlySelected == selected) {
              var cell = grid.getCellFromEvent(e);
              var range = grid.getRenderedRange();
              if (cell == null) return;
              var el1 = $(grid.getCellNode(cell.row, cell.cell));
              if (el1 == null) return;
              var x1 = $(grid.getCellNode(cell.row, cell.cell)).text();
              for (var ix = range.top; ix < range.bottom+1; ix++) {
                var el2 = $(grid.getCellNode(ix, cell.cell));
                if (el2 == null) return;
                var x2 = el2.text();
                if (x1 == x2) {
                  el2.addClass("highlight");
                  colored.push(el2);
                }
              }
              needsCleaning = true;
            }
          }, 350);
        }
        wait(selected);
      });

      grid.onMouseLeave.subscribe(function (e) {
        currentlySelected = undefined;
        if (!needsCleaning) return;
        for (var ix = 0; ix < colored.length; ix++) {
          colored[ix].removeClass("highlight");
        }
        colored.length = 0;
      });
    }

    function init() {
      grid = new Slick.Grid("#characterTable", {getLength: getLength, getItem: getItem}, gridColumns, gridOptions);

      grid.resizeCanvas();
      grid.autosizeColumns();
      grid.render();

      grid.onSort.subscribe(function (e, args) {
        sorted = true;
        currentSortCol = args.sortCol;
        isAsc = args.sortAsc;
        grid.invalidateAllRows();
        grid.render();
      });

      grid.onClick.subscribe(function (e) {
        var cell = grid.getCellFromEvent(e);
        var column = grid.getColumns()[cell.cell];
        console.log(column);
      });

      grid.onDblClick.subscribe(function (e) {
        var cell = grid.getCellFromEvent(e);
        var column = grid.getColumns()[cell.cell];
        if (column.id === 'name') shell.openExternal("https://zkillboard.com/character/" + charData[cell.row].character_id + "/");
        else if (column.id === 'corporation_name') shell.openExternal("https://zkillboard.com/corporation/" + charData[cell.row].corporation_id + "/");
        else if (column.id === 'alliance_name') shell.openExternal("https://zkillboard.com/alliance/" + charData[cell.row].alliance_id + "/");
      });

      highlighter();

    }

    function getCharacterData(name, callback) {

      var spinning = false;

      var retry = function(baseDelay) {
        var delay = baseDelay * Math.random();
        var timeout = setTimeout(function() {
          getCharacterData(name, callback);
        }, delay);
      }

      var success = function(data) {
        if (spinning) aMethods.stopSpinning();
        spinning = false;
        return callback(data);
      }

      var request = {
        url: apiURL + "/" + name,
        method: 'GET',
        dataType: 'json',
        timeout: apiTimeout,
        success: success,
        headers: apiHeaders,
        error: function(xhr) {
          var data = { name: name, status: xhr.status };
          switch(xhr.status) {
            case 400:
              return success(data);
            case 404:
              return success(data);
            case 500:
              return success(data);
            case 429:
              return retry(apiThrottle);
            default:
              if (xhr.statusText == 'abort') return;
              spinning = true;
              aMethods.startSpinning("Connection to the server lost! Reconnecting..");
              return retry(apiRetry);
          }
        }
      }

      apiManager.addRequest(request);

    };

    function processCharacters(data) {
      if (data.length < 3) {
        Lobibox.notify('warning', {
          soundPath: 'assets/sounds/',
          icon: false,
          position: 'center top', //or 'center bottom'
          msg: "There's nothing on your clipboard/manual input to scan."
        });
      }

      var list = data.split('\n');
      if (list.length > 2000) {
        Lobibox.notify('warning', {
          soundPath: 'assets/sounds/',
          icon: false,
          position: 'center top', //or 'center bottom'
          msg: "It's not recommended to scan this many characters at once."
        });
      }

      for (var i = 0; i < list.length; i++) {
        if (list[i].trim().length > 32) return;
      }

      if (a.triggerMode == 'auto') {
        var containsName = false;
        for (var i = 0; i < list.length; i++) {
          if (list[i].trim().toLowerCase() === a.characterName.trim().toLowerCase()) {
            containsName = true;
            break;
          }
        }
        if (!containsName) return;
      }

      a.scanning = true;

      apiManager.stop();
      clear();

      for (var i = 0; i < list.length; i++) {
        var name = list[i].trim().toLowerCase();
        getCharacterData(name, function(data) {
          $('#characterProgressbar').progress("increment");
          data.name = data.name.toUpperCase();
          data.securityStatus = Math.round( data.security_status * 10 ) / 10;
          if (data.status != undefined) data.name = "**" + data.name + "**";
          data.KD = Math.round( data.KD * 10 ) / 10;
          data.characterAgeYears = Math.round( data.character_age/365 * 10 ) / 10;
          add(data);
          if(!document.hasFocus()) scrollDown();
        });
      }

      apiManager.start(function() {
        autosize();

        if(!document.hasFocus()) scrollUp();
        console.log("done");
        a.scanning = false;
        generateIndices();
        updateCounters();
      });

    }

    return {
      init,
      processCharacters, add, clear, autosize
    }
  }(a.charData));

  var processCharacters = charManager.processCharacters;

  // VUE.js //////////////////////////////////////////////////////////////////////////////

  // Vue.js methods
  var aMethods = {
    exit: function() {
      remote.getCurrentWindow().close()
    },
    switchForceOnTop: function() {
      a.forceOnTop = !a.forceOnTop;
      remote.getCurrentWindow().setAlwaysOnTop(a.forceOnTop);
    },
    startAuto: function() {
      var name = $("#nameInput > div > input").val();
      if (name.length > 3) {
        a.triggerMode = 'auto';
        a.characterName = name;
        $("#nameInput").slideUp();
      } else {
        alert("I do not believe that's your name. It's used as a trigger, so please type it in.");
      }
    },
    changeTriggerMode: function(mode) {
      if (mode == 'auto') {
        if (a.triggerMode != 'off') {
          a.triggerMode = 'off';
          $("#nameInput").slideDown();
          return;
        } else if (a.triggerMode == 'off') {
          mode = 'shortcut';
        }
      } else if (mode == 'manual') {
        if (a.triggerMode == 'manual') {
          mode = 'shortcut';
        }
      }
      a.triggerMode = mode;
      $("#nameInput").slideUp();
    },
    doScan: function() {
      switch(a.triggerMode) {
        case "manual":
          processCharacters($("#manualInput > textarea").val());
          break;
        default:
          var input = clipboardy.readSync();
          if (input === a.lastInput) return;
          a.lastInput = input;
          return processCharacters(input);
      };
    },
    fitTable: function() {
      charManager.autosize();
    }
  };

  aMethods.startSpinning = function(text){ a.loading = true; a.loadingText = text; }
  aMethods.stopSpinning =  function(){ a.loading = false; a.loadingText = "Loading.."; }

  var app = new Vue({ el: '#app', data: a, methods: aMethods });
  charManager.init();

  /*
  // This seemed less laggy than binding to the resize event
  var lastWidth = $(window).width();
  var lastHeight = $(window).height();
  setInterval(function() {
    var newWidth = $(window).width();
    var newHeight = $(window).height();
    if (newWidth != lastWidth || newHeight != lastHeight) {
      grid.autosizeColumns();
      grid.resizeCanvas();
    }
  }, 1000);
  */

  const globalShortcut = remote.getGlobal("globalShortcut");
  const ret = globalShortcut.register('CommandOrControl+Shift+C', () => { if (a.triggerMode == 'shortcut') aMethods.doScan(); })

  function versionCheck() {
    var request = {
      url: "http://51.15.49.79/test/",
      method: 'GET',
      dataType: 'json',
      timeout: apiTimeout,
      headers: apiHeaders,
      success: function(data) {
        if (data.evelscanversion !== version) {
          Lobibox.alert('info',
          {
            icon: false,
            sound: true,
            soundSrc: "/assets/sounds/",
            title: "A new update is available.",
            msg: 'There is a new version available for download <a href="https://github.com/jeperi/evelscan/releases">here</a>.<br>'
          });
        }
        aMethods.stopSpinning();
      },
      error: function(xhr) {
        aMethods.startSpinning("We have connection problems.. Reconnecting..");
        return versionCheck();
      }
    }

    apiManager.addRequest(request);
    apiManager.start();
  }

  $('.tooltip').tooltipster({
     animation: 'fade',
     delay: 400,
     theme: 'tooltipster-punk',
  });

  Lobibox.alert('error', {
    msg: 'This program is in beta and under development. The program checks for updates automatically and connects to internet service(s) to retrieve data on character(s). Your clipboard may be read and the content on it parsed. Safeguards are in place to prevent accidental leakage of information, but you are responsible for keeping sensitive information safe. Depending on your settings, the data acquired from your clipboard may be sent to a server. This program is free software and comes without any warranty, to the extent permitted by applicable law.',
    buttons: {
      yes: {text: "Accept"},
      no: {text: "Exit" }
    },
    title: 'Welcome!',
    closeButton: false,
    callback: function(lobibox, type){
        if (type === 'no'){
            remote.getCurrentWindow().close()
            return;
        }
        a.blanked = false;
        versionCheck();
    }
  });

  $("#spinnerDimmer").show();

});
