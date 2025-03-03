/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const FAVICON_URI = NetUtil.newURI(do_get_file("favicon-normal32.png"));
const FAVICON_DATA = readFileData(do_get_file("favicon-normal32.png"));
const FAVICON_MIMETYPE = "image/png";
const ICON32_URL = "http://places.test/favicon-normal32.png";

const FAVICON16_DATA = readFileData(do_get_file("favicon-normal16.png"));
const ICON16_URL = "http://places.test/favicon-normal16.png";

add_task(async function test_normal() {
  Assert.equal(FAVICON_DATA.length, 344);
  let pageURI = NetUtil.newURI("http://example.com/normal");

  await PlacesTestUtils.addVisits(pageURI);
  await new Promise(resolve => {
    PlacesUtils.favicons.setAndFetchFaviconForPage(
      pageURI,
      FAVICON_URI,
      true,
      PlacesUtils.favicons.FAVICON_LOAD_NON_PRIVATE,
      function () {
        PlacesUtils.favicons.getFaviconDataForPage(
          pageURI,
          function (aURI, aDataLen, aData, aMimeType) {
            Assert.ok(aURI.equals(FAVICON_URI));
            Assert.equal(FAVICON_DATA.length, aDataLen);
            Assert.ok(compareArrays(FAVICON_DATA, aData));
            Assert.equal(FAVICON_MIMETYPE, aMimeType);
            resolve();
          }
        );
      },
      Services.scriptSecurityManager.getSystemPrincipal()
    );
  });
});

add_task(async function test_missing() {
  let pageURI = NetUtil.newURI("http://example.com/missing");

  await new Promise(resolve => {
    PlacesUtils.favicons.getFaviconDataForPage(
      pageURI,
      function (aURI, aDataLen, aData, aMimeType) {
        // Check also the expected data types.
        Assert.ok(aURI === null);
        Assert.ok(aDataLen === 0);
        Assert.ok(aData.length === 0);
        Assert.ok(aMimeType === "");
        resolve();
      }
    );
  });
});

add_task(async function test_fallback() {
  const ROOT_URL = "https://www.example.com/";
  const ROOT_ICON_URL = ROOT_URL + "favicon.ico";
  const SUBPAGE_URL = ROOT_URL + "/missing";

  info("Set icon for the root");
  await PlacesTestUtils.addVisits(ROOT_URL);
  let data = readFileData(do_get_file("favicon-normal16.png"));
  let dataURL = await fileDataToDataURL(data, "image/png");
  await PlacesTestUtils.setFaviconForPage(ROOT_URL, ROOT_ICON_URL, dataURL);

  info("check fallback icons");
  await new Promise(resolve => {
    PlacesUtils.favicons.getFaviconDataForPage(
      NetUtil.newURI(ROOT_URL),
      (aURI, aDataLen, aData, aMimeType) => {
        Assert.equal(aURI.spec, ROOT_ICON_URL);
        Assert.equal(aDataLen, data.length);
        Assert.deepEqual(aData, data);
        Assert.equal(aMimeType, "image/png");
        resolve();
      }
    );
  });
  await new Promise(resolve => {
    PlacesUtils.favicons.getFaviconDataForPage(
      NetUtil.newURI(SUBPAGE_URL),
      (aURI, aDataLen, aData, aMimeType) => {
        Assert.equal(aURI.spec, ROOT_ICON_URL);
        Assert.equal(aDataLen, data.length);
        Assert.deepEqual(aData, data);
        Assert.equal(aMimeType, "image/png");
        resolve();
      }
    );
  });

  info("Now add a proper icon for the page");
  await PlacesTestUtils.addVisits(SUBPAGE_URL);
  let data32 = readFileData(do_get_file("favicon-normal32.png"));
  let dataURL32 = await fileDataToDataURL(data32, "image/png");
  await PlacesTestUtils.setFaviconForPage(SUBPAGE_URL, ICON32_URL, dataURL32);

  info("check no fallback icons");
  await new Promise(resolve => {
    PlacesUtils.favicons.getFaviconDataForPage(
      NetUtil.newURI(ROOT_URL),
      (aURI, aDataLen, aData, aMimeType) => {
        Assert.equal(aURI.spec, ROOT_ICON_URL);
        Assert.equal(aDataLen, data.length);
        Assert.deepEqual(aData, data);
        Assert.equal(aMimeType, "image/png");
        resolve();
      }
    );
  });
  await new Promise(resolve => {
    PlacesUtils.favicons.getFaviconDataForPage(
      NetUtil.newURI(SUBPAGE_URL),
      (aURI, aDataLen, aData, aMimeType) => {
        Assert.equal(aURI.spec, ICON32_URL);
        Assert.equal(aDataLen, data32.length);
        Assert.deepEqual(aData, data32);
        Assert.equal(aMimeType, "image/png");
        resolve();
      }
    );
  });
});

add_task(async function test_richIconPrioritizationBelowThreshold() {
  const PAGE_URL = "https://example.com/test_prioritization_below_threshold";

  await PlacesTestUtils.addVisits(PAGE_URL);

  let dataURL = await fileDataToDataURL(FAVICON16_DATA, "image/png");
  await PlacesTestUtils.setFaviconForPage(
    PAGE_URL,
    ICON16_URL,
    dataURL,
    0,
    false // Non-rich
  );

  let richDataURL = await fileDataToDataURL(FAVICON_DATA, "image/png");
  await PlacesTestUtils.setFaviconForPage(
    PAGE_URL,
    ICON32_URL,
    richDataURL,
    0,
    true // Rich
  );

  // Non-rich icons should be prioritized for preferred width <= 64px.
  await new Promise(resolve => {
    PlacesUtils.favicons.getFaviconDataForPage(
      NetUtil.newURI(PAGE_URL),
      (aURI, aDataLen, aData, aMimeType) => {
        Assert.equal(aURI.spec, ICON16_URL);
        Assert.equal(aDataLen, FAVICON16_DATA.length);
        Assert.deepEqual(aData, FAVICON16_DATA);
        Assert.equal(aMimeType, FAVICON_MIMETYPE);
        resolve();
      },
      12
    );
  });
});

add_task(async function test_richIconPrioritizationAboveThreshold() {
  const PAGE_URL = "https://example.com/test_prioritization_above_threshold";

  await PlacesTestUtils.addVisits(PAGE_URL);

  let dataURL = await fileDataToDataURL(FAVICON16_DATA, "image/png");
  await PlacesTestUtils.setFaviconForPage(
    PAGE_URL,
    ICON16_URL,
    dataURL,
    0,
    false // Non-rich
  );

  let richDataURL = await fileDataToDataURL(FAVICON_DATA, "image/png");
  await PlacesTestUtils.setFaviconForPage(
    PAGE_URL,
    ICON32_URL,
    richDataURL,
    0,
    true // Rich
  );

  // Non-rich icons should not be prioritized for preferred width > 64px.
  await new Promise(resolve => {
    PlacesUtils.favicons.getFaviconDataForPage(
      NetUtil.newURI(PAGE_URL),
      (aURI, aDataLen, aData, aMimeType) => {
        Assert.equal(aURI.spec, ICON32_URL);
        Assert.equal(aDataLen, FAVICON_DATA.length);
        Assert.deepEqual(aData, FAVICON_DATA);
        Assert.equal(aMimeType, FAVICON_MIMETYPE);
        resolve();
      },
      72
    );
  });
});
