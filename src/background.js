/**
 * Comparison functions
 */
function compareByUrlAsc(a, b) {
    return a.url.localeCompare(b.url);
}

function compareByUrlDesc(a, b) {
    return b.url.localeCompare(a.url);
}

function compareByDomainAsc(a, b) {
    let url1 = new URL(a.url);
    let url2 = new URL(b.url);

    let domain1 = url1.hostname
        .split(".")
        .slice(-2)
        .join(".");
    let domain2 = url2.hostname
        .split(".")
        .slice(-2)
        .join(".");

    return domain1.localeCompare(domain2);
}

function compareByDomainDesc(a, b) {
    let url1 = new URL(a.url);
    let url2 = new URL(b.url);

    let domain1 = url1.hostname
        .split(".")
        .slice(-2)
        .join(".");
    let domain2 = url2.hostname
        .split(".")
        .slice(-2)
        .join(".");

    return domain2.localeCompare(domain1);
}

function compareByTitleAsc(a, b) {
    return a.title.localeCompare(b.title);
}

function compareByTitleDesc(a, b) {
    return b.title.localeCompare(a.title);
}

function compareByLastAccessAsc(a, b) {
    if (a.lastAccessed < b.lastAccessed) {
        return -1;
    } else if (a.lastAccessed > b.lastAccessed) {
        return 1;
    } else {
        return 0;
    }
}

function compareByLastAccessDesc(a, b) {
    if (b.lastAccessed < a.lastAccessed) {
        return -1;
    } else if (b.lastAccessed > a.lastAccessed) {
        return 1;
    } else {
        return 0;
    }
}

function compareByContainerAsc(a, b) {
    if (a.cookieStoreId < b.cookieStoreId) {
        return -1;
    } else if (a.cookieStoreId > b.cookieStoreId) {
        return 1;
    } else {
        return 0;
    }
}

function compareByContainerDesc(a, b) {
    if (b.cookieStoreId < a.cookieStoreId) {
        return -1;
    } else if (b.cookieStoreId > a.cookieStoreId) {
        return 1;
    } else {
        return 0;
    }
}

function onSettingsSortAuto(evt) {
  if (evt.target.checked) {
    browser.tabs.onUpdated.addListener(settingsSortAutoHandler);
    browser.tabs.onCreated.addListener(settingsSortAutoHandler);
  } else {
    browser.tabs.onUpdated.removeListener(settingsSortAutoHandler);
    browser.tabs.onCreated.removeListener(settingsSortAutoHandler);
  }

  return Promise.resolve();
}

function onSettingsSortPinned(evt) {
  return Promise.resolve();
}

let menuIdToComparator = {
    "sort-by-url-asc" : compareByUrlAsc,
    "sort-by-url-desc" : compareByUrlDesc,
    "sort-by-domain-asc" : compareByDomainAsc,
    "sort-by-domain-desc" : compareByDomainDesc,
    "sort-by-last-access-asc" : compareByLastAccessAsc,
    "sort-by-last-access-desc" : compareByLastAccessDesc,
    "sort-by-title-asc" : compareByTitleAsc,
    "sort-by-title-desc" : compareByTitleDesc,
    "sort-by-container-asc" : compareByContainerAsc,
    "sort-by-container-desc" : compareByContainerDesc,
};

let settingsMenuIdToHandler = {
  "settings-sort-auto": onSettingsSortAuto,
  "settings-sort-pinned": onSettingsSortPinned
};

function sortTabsComparatorName(compName, settings) {
  return sortTabs(menuIdToComparator[compName], settings);
}

function settingsSortAutoHandler(tabId, changeInfo, tabInfo) {
  browser.storage.local.get({
    "last-comparator": undefined,
    "settings-sort-auto": false,
    "settings-sort-pinned": false
  }).then(
    (settings) => {
      if (menuIdToComparator[settings["last-comparator"]] !== undefined) {
        return sortTabs(menuIdToComparator[settings["last-comparator"]], settings);
      }
    }, onError);
}

function sortTabs(comparator, settings) {
    let num_pinned = 0;
    return browser.tabs.query({
        pinned : true,
        currentWindow : true
    }).then(
        (pinnedTabs) => {
            num_pinned = pinnedTabs.length;

            if (settings["settings-sort-pinned"]) {
                console.log("Sorting pinned: " + num_pinned.toString());
                pinnedTabs.sort(comparator);
                return browser.tabs.move(
                    pinnedTabs.map((tab) => { return tab.id; }),
                    { index : 0 });
            } else {
                return [];
            }
        }, onError).then(

            (_) => {
                return browser.tabs.query({
                    pinned : false,
                    currentWindow : true
                }).then(
                    (ts) => {
                        // Chunk all tabs from given groups together
                        // Sort each chunk
                        // Then move the tabs

                        console.log("Sorting normal " + ts.length.toString());
                        const groupBoundaries = [0];

                        for (let i = 1; i < ts.length; i++) {
                            if (ts[i].groupId != ts[i - 1].groupId) {
                                groupBoundaries.push(i);
                            }
                        }

                        // Add end - slice range is non-inclusive
                        groupBoundaries.push(ts.length);
                        const groupChunks = [];

                        for (let i = 1; i < groupBoundaries.length; i++) {
                            groupChunks.push(ts.slice(groupBoundaries[i - 1], groupBoundaries[i]));
                        }

                        for (chunk of groupChunks) {
                            chunk.sort(comparator);
                        }

                        const newTabIds = groupChunks.flat().map((t) => t.id);

                        return browser.tabs.move(
                            newTabIds,
                            { index : num_pinned });
                    }, onError);

            }, onError);
}

function settingChanged(evt) {
  return settingsMenuIdToHandler[evt.target.id](evt)
    .then(
      (e) => {
        return browser.storage.local.set({
          [evt.target.id]: evt.target.checked
        });
      }, onError);
}

function onError(error) {
  console.trace(error);
}
