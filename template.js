const BigQuery = require('BigQuery');
const computeEffectiveTldPlusOne = require('computeEffectiveTldPlusOne');
const createRegex = require('createRegex');
const generateRandom = require('generateRandom');
const getAllEventData = require('getAllEventData');
const getContainerVersion = require('getContainerVersion');
const getCookieValues = require('getCookieValues');
const getEventData = require('getEventData');
const getRequestHeader = require('getRequestHeader');
const getTimestampMillis = require('getTimestampMillis');
const getType = require('getType');
const JSON = require('JSON');
const logToConsole = require('logToConsole');
const makeInteger = require('makeInteger');
const makeNumber = require('makeNumber');
const makeString = require('makeString');
const Math = require('Math');
const Object = require('Object');
const parseUrl = require('parseUrl');
const sendHttpRequest = require('sendHttpRequest');
const setCookie = require('setCookie');
const sha256Sync = require('sha256Sync');

/*==============================================================================
==============================================================================*/

const eventData = getAllEventData();

if (shouldExitEarly(data, eventData)) return;

const mappedData = mapEvent(data, eventData);
setCookies(data, mappedData);

const invalidOrMissingFields = validateMappedData(mappedData);
if (invalidOrMissingFields) {
  log({
    Name: 'LineYahooCAPITag',
    Type: 'Message',
    EventName: mappedData.data[0].event.event_type,
    Message: 'Request was not sent.',
    Reason: invalidOrMissingFields
  });

  return data.gtmOnFailure();
}

sendRequest(data, mappedData);

if (data.useOptimisticScenario) {
  return data.gtmOnSuccess();
}

/*==============================================================================
  Vendor related functions
==============================================================================*/

function setCookies(data, mappedData) {
  const cookieOptions = {
    domain: getCookieDomain(data.cookieDomain),
    samesite: data.cookieSameSite || 'Lax',
    path: '/',
    secure: true,
    httpOnly: !!data.cookieHttpOnly,
    'max-age': 60 * 60 * 24 * makeInteger(data.cookieExpiration || 365)
  };

  if (data.setAnonymousIdCookie && mappedData.data[0].user.ly_su) {
    setCookie('_ly_su', mappedData.data[0].user.ly_su, cookieOptions, false);
  }

  if (data.setClickIdCookie && mappedData.data[0].user.ly_c) {
    setCookie('_ly_c', mappedData.data[0].user.ly_c, cookieOptions, false);
  }

  if (data.setComplementaryClickIdCookie && mappedData.data[0].user.ly_r) {
    setCookie('_ly_r', mappedData.data[0].user.ly_r, cookieOptions, false);
  }
}

function addServerEventData(data, eventData, event) {
  const serverEventData = {
    event_type: mapEventType(data, eventData),
    action_source: data.actionSource,
    test_flag: isUIFieldTrue(data.testFlag)
  };

  if (data.eventSnippetId && serverEventData.event_type !== 'page_view') {
    serverEventData.event_snippet_id = makeString(data.eventSnippetId);
  }

  if (data.autoMapServerEventDataParameters) {
    serverEventData.event_time = getTimestampSeconds();

    const eventId = eventData.transaction_id || eventData.event_id || eventData.eventId;
    if (eventId) serverEventData.transaction_id = makeString(eventId);
  }

  if (data.serverEventDataList) {
    data.serverEventDataList.forEach((d) => (serverEventData[d.name] = d.value));
  }

  event.event = serverEventData;

  return event;
}

function getEmailAddressFromEventData(eventData) {
  const eventDataUserData = eventData.user_data || {};
  const email =
    eventData.email ||
    eventData.email_address ||
    eventDataUserData.email ||
    eventDataUserData.email_address ||
    eventDataUserData.sha256_email_address;
  const emailType = getType(email);

  if (emailType === 'string') return email;
  else if (emailType === 'array' || emailType === 'object') return email[0];

  return;
}

function getPhoneNumberFromEventData(eventData) {
  const eventDataUserData = eventData.user_data || {};

  const phone =
    eventData.phone ||
    eventData.phone_number ||
    eventDataUserData.phone ||
    eventDataUserData.phone_number ||
    eventDataUserData.sha256_phone ||
    eventDataUserData.sha256_phone_number;

  const phoneType = getType(phone);

  if (phoneType === 'string') return phone;
  else if (phoneType === 'array' || phoneType === 'object') return phone[0];

  return;
}

function getAnonymousId(eventData) {
  const anonymousId = getCookieValues('_ly_su')[0] || eventData._ly_su || eventData.ly_su;
  if (anonymousId) return anonymousId;

  if (data.setAnonymousIdCookie) return getTimestampSeconds() + '.' + generateUUID();
}

function parseClickIdFromUrl(eventData, clickIdName) {
  const url = eventData.page_location || eventData.page_referrer || getRequestHeader('referer');
  if (!url) return;

  const urlSearchParams = parseUrl(url).searchParams;
  return urlSearchParams[clickIdName];
}

function getClickId(eventData, clickIdName) {
  const clickIdNameWithPrefix = '_' + clickIdName;
  const clickIdFromUrl = parseClickIdFromUrl(eventData, clickIdNameWithPrefix);
  const clickId =
    (clickIdFromUrl ? getTimestampSeconds() + '.' + clickIdFromUrl : undefined) ||
    getCookieValues(clickIdNameWithPrefix)[0] ||
    eventData[clickIdNameWithPrefix] ||
    eventData[clickIdName];

  if (clickId) return clickId;
}

function addUserIdentifiers(data, eventData, event) {
  const userData = {};

  if (isUIFieldTrue(data.autoMapUserIdentifiersParameters)) {
    const email = getEmailAddressFromEventData(eventData);
    if (email) userData.hashed_email = email;

    const phone = getPhoneNumberFromEventData(eventData);
    if (phone) userData.hashed_phone_number = phone;

    const mobileDeviceId = eventData['x-ga-resettable_device_id'];
    if (mobileDeviceId) userData.ifa = mobileDeviceId;

    const anonymousId = getAnonymousId(eventData);
    if (anonymousId) userData.ly_su = anonymousId;

    const clickId = getClickId(eventData, 'ly_c');
    if (clickId) userData.ly_c = clickId;

    const complementaryClickId = getClickId(eventData, 'ly_r');
    if (complementaryClickId) userData.ly_r = complementaryClickId;
  }

  if (data.userIdentifiersParametersList) {
    data.userIdentifiersParametersList.forEach((d) => (userData[d.name] = d.value));
  }

  event.user = userData;

  return event;
}

function addEventParameters(data, eventData, event) {
  const isPageView = event.event.event_type === 'page_view';
  const eventParameters = {};

  if (isUIFieldTrue(data.autoMapEventParameters)) {
    let currencyFromItems;
    let valueFromItems;
    let items;

    if (!isPageView) {
      if (getType(eventData.items) === 'array' && eventData.items.length) items = eventData.items;
      else if (
        getType(eventData.ecommerce) === 'object' &&
        getType(eventData.ecommerce.items) === 'array' &&
        eventData.ecommerce.items.length
      ) {
        items = eventData.ecommerce.items;
      }

      if (getType(items) === 'array' && items.length) {
        eventParameters.items = [];
        valueFromItems = 0;
        currencyFromItems = items[0].currency;
        const itemIdKey = data.itemIdKey ? data.itemIdKey : 'item_id';
        items.forEach((i) => {
          const item = {};
          if (i[itemIdKey]) item.item_id = makeString(i[itemIdKey]);
          if (isValidValue(i.quantity)) item.quantity = makeInteger(i.quantity);
          if (isValidValue(i.price)) {
            item.price = roundValue(i.price);
            if (isValidValue(item.price)) {
              valueFromItems += (item.quantity || 1) * item.price;
            }
          }
          eventParameters.items.push(item);
        });
      }
    }

    if (isValidValue(eventData.value)) {
      eventParameters.value = roundValue(eventData.value);
    } else if (isValidValue(valueFromItems)) {
      eventParameters.value = roundValue(valueFromItems);
    }

    const currency = eventData.currency || currencyFromItems;
    if (currency || isValidValue(eventParameters.value)) eventParameters.currency = 'JPY';
  }

  if (data.eventParametersList) {
    data.eventParametersList.forEach((d) => {
      if (d.name === 'items' && isPageView) return;
      if (d.name === 'currency') d.value = 'JPY';
      else if (d.name === 'value' && isValidValue(d.value)) d.value = roundValue(d.value);
      eventParameters[d.name] = d.value;
    });
  }

  event.custom = eventParameters;

  return event;
}

function addWebData(data, eventData, event) {
  const webData = {};

  if (data.autoMapWebParameters) {
    if (eventData.page_location) webData.url = eventData.page_location;
    if (eventData.page_referrer) webData.referrer_url = eventData.page_referrer;
    if (eventData.ip_override) webData.ip = eventData.ip_override;
    if (eventData.user_agent) webData.user_agent = eventData.user_agent;
  }

  if (data.webParametersList) {
    data.webParametersList.forEach((d) => (webData[d.name] = d.value));
  }

  event.web = webData;

  return event;
}

function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return phoneNumber;

  phoneNumber = makeString(phoneNumber).trim();
  const startsWithPlus = phoneNumber.indexOf('+') === 0;

  const nonDigitsRegex = createRegex('[^0-9]', 'g');
  phoneNumber = phoneNumber.replace(nonDigitsRegex, '');

  if (!phoneNumber) return phoneNumber;

  if (startsWithPlus) return '+' + phoneNumber;

  // Enhanced support for Japanese phone numbers
  if (phoneNumber.indexOf('0') === 0) return '+81' + phoneNumber.substring(1);
  if (phoneNumber.indexOf('81') === 0) return '+' + phoneNumber;
  return '+81' + phoneNumber;
}

function hashDataIfNeeded(event) {
  const userData = event.user;
  const hasUserData = hasProps(userData);

  if (hasUserData) {
    const userDataKeysToHash = {
      hashed_email: true,
      hashed_phone_number: true
    };
    const userDataKeysNormalizer = {
      hashed_phone_number: normalizePhoneNumber
    };

    Object.keys(userDataKeysToHash).forEach((key) => {
      let value = userData[key];
      if (!value || isHashed(value)) return;
      if (userDataKeysNormalizer[key]) value = userDataKeysNormalizer[key](value);
      userData[key] = hashData(value);
    });
  }

  return event;
}

function mapEventType(data, eventData) {
  if (data.eventType === 'inherit') {
    const eventName = eventData.event_name;
    const gaToEventName = {
      page_view: 'page_view',
      view_item_list: 'view_listing',
      view_item: 'view_product',
      add_to_cart: 'add_cart',
      view_cart: 'view_cart',
      begin_checkout: 'check_out',
      add_payment_info: 'payment_info',
      generate_lead: 'generate_lead',
      purchase: 'purchase',
      view_search_results: 'search',
      search: 'search',
      login: 'login',
      sign_up: 'sign_up',
      add_to_wishlist: 'add_wishlist'
    };

    return gaToEventName[eventName] || eventName;
  }

  return data.eventType === 'standard' ? data.eventTypeStandard : undefined;
}

function mapEvent(data, eventData) {
  const event = {};
  const mappedData = {
    tag_id: data.tagId,
    channel_id: data.channelId,
    data: [event]
  };

  addServerEventData(data, eventData, event);
  addUserIdentifiers(data, eventData, event);
  addWebData(data, eventData, event);
  addEventParameters(data, eventData, event);
  hashDataIfNeeded(event);

  return mappedData;
}

function validateMappedData(mappedData) {
  const event = mappedData.data[0];

  if (!mappedData.tag_id) return 'Tag ID is missing.';

  if (!hasProps(event.user) || Object.values(event.user).every((v) => !v))
    return 'User data is missing.';

  if (event.user.line_uid && !mappedData.channel_id)
    return 'Channel ID must be set when Line User ID is set.';

  if (isValidValue(event.custom.value) && !event.custom.currency)
    return 'Currency must be set when Value is set.';
  if (!isValidValue(event.custom.value) && event.custom.currency)
    return 'Value must be set when Currency is set.';

  if (getType(event.custom.items) === 'array' && event.custom.items.length > 10)
    return 'Items array maximum length is 10.';

  if (
    getType(event.custom.items) === 'array' &&
    event.custom.items.some(
      (i) => (isValidValue(i.price) || isValidValue(i.quantity)) && !i.item_id && !i.category_id
    )
  ) {
    return 'Items array must have "item_id" or "category_id" when "price" or "quantity" is present.';
  }
}

function generateRequestBaseUrl() {
  const version = 'v1';
  return 'https://conversion-api.yahooapis.jp/' + version;
}

function generateRequestOptions(data) {
  const options = {
    method: 'POST',
    headers: {
      'X-TagAccessToken': data.accessToken,
      'Content-Type': 'application/json'
    }
  };

  return options;
}

function sendRequest(data, mappedData) {
  const requestUrl = generateRequestBaseUrl();
  const requestOptions = generateRequestOptions(data);

  const eventName = mappedData.data[0].event.event_type;
  const tagId = mappedData.tag_id;
  log({
    Name: 'LineYahooCAPITag',
    Type: 'Request',
    EventName: eventName,
    RequestMethod: requestOptions.method,
    RequestUrl: requestUrl,
    RequestBody: mappedData,
    Message: 'Tag ID: ' + tagId
  });

  return sendHttpRequest(requestUrl, requestOptions, JSON.stringify(mappedData))
    .then((result) => {
      log({
        Name: 'LineYahooCAPITag',
        Type: 'Response',
        EventName: eventName,
        ResponseStatusCode: result.statusCode,
        ResponseHeaders: result.headers,
        ResponseBody: result.body,
        Message: 'Tag ID: ' + tagId
      });

      if (result.statusCode === 202) {
        return !data.useOptimisticScenario ? data.gtmOnSuccess() : undefined;
      }
      return !data.useOptimisticScenario ? data.gtmOnFailure() : undefined;
    })
    .catch((result) => {
      log({
        Name: 'LineYahooCAPITag',
        Type: 'Message',
        EventName: eventName,
        Message: 'Request failed or timed out. Tag ID: ' + tagId,
        Reason: JSON.stringify(result)
      });

      return !data.useOptimisticScenario ? data.gtmOnFailure() : undefined;
    });
}

/*==============================================================================
  Helpers
==============================================================================*/

function getUrl(eventData) {
  return eventData.page_location || getRequestHeader('referer') || eventData.page_referrer;
}

function shouldExitEarly(data, eventData) {
  if (!isConsentGivenOrNotRequired(data, eventData)) {
    data.gtmOnSuccess();
    return true;
  }

  const url = getUrl(eventData);
  if (url && url.lastIndexOf('https://gtm-msr.appspot.com/', 0) === 0) {
    data.gtmOnSuccess();
    return true;
  }
}

function getCookieDomain(defaultCookieDomain) {
  return !defaultCookieDomain || defaultCookieDomain === 'auto'
    ? computeEffectiveTldPlusOne(getEventData('page_location') || getRequestHeader('referer')) ||
        'auto'
    : defaultCookieDomain;
}

function isUIFieldTrue(field) {
  return [true, 'true'].indexOf(field) !== -1;
}

function isValidValue(value) {
  const valueType = getType(value);
  return valueType !== 'null' && valueType !== 'undefined' && value !== '' && value === value;
}

function getTimestampSeconds() {
  return makeInteger(getTimestampMillis() / 1000);
}

function roundValue(value) {
  if (!value) return value;
  return Math.round(makeNumber(value) * 100) / 100;
}

function random() {
  return generateRandom(1000000000000000, 10000000000000000) / 10000000000000000;
}

function generateUUID() {
  function s(n) {
    return h((random() * (1 << (n << 2))) ^ getTimestampMillis()).slice(-n);
  }
  function h(n) {
    return (n | 0).toString(16);
  }
  return [
    s(4) + s(4),
    s(4),
    '4' + s(3),
    h(8 | (random() * 4)) + s(3),
    getTimestampMillis().toString(16).slice(-10) + s(2)
  ].join('-');
}

function hasProps(obj) {
  return getType(obj) === 'object' && Object.keys(obj).length > 0;
}

function isHashed(value) {
  if (!value) return false;
  return makeString(value).match('^[A-Fa-f0-9]{64}$') !== null;
}

function hashData(value) {
  if (!value) return value;

  const type = getType(value);

  if (value === 'undefined' || value === 'null') return undefined;

  if (type === 'array') {
    return value.map((val) => hashData(val));
  }

  if (type === 'object') {
    return Object.keys(value).reduce((acc, val) => {
      acc[val] = hashData(value[val]);
      return acc;
    }, {});
  }

  if (isHashed(value)) return value;

  return sha256Sync(makeString(value).trim().toLowerCase(), {
    outputEncoding: 'hex'
  });
}

function isConsentGivenOrNotRequired(data, eventData) {
  if (data.adStorageConsent !== 'required') return true;
  if (eventData.consent_state) return !!eventData.consent_state.ad_storage;
  const xGaGcs = eventData['x-ga-gcs'] || ''; // x-ga-gcs is a string like "G110"
  return xGaGcs[2] === '1';
}

function log(rawDataToLog) {
  const logDestinationsHandlers = {};
  if (determinateIsLoggingEnabled()) logDestinationsHandlers.console = logConsole;
  if (determinateIsLoggingEnabledForBigQuery()) logDestinationsHandlers.bigQuery = logToBigQuery;

  rawDataToLog.TraceId = getRequestHeader('trace-id');

  const keyMappings = {
    // No transformation for Console is needed.
    bigQuery: {
      Name: 'tag_name',
      Type: 'type',
      TraceId: 'trace_id',
      EventName: 'event_name',
      RequestMethod: 'request_method',
      RequestUrl: 'request_url',
      RequestBody: 'request_body',
      ResponseStatusCode: 'response_status_code',
      ResponseHeaders: 'response_headers',
      ResponseBody: 'response_body'
    }
  };

  for (const logDestination in logDestinationsHandlers) {
    const handler = logDestinationsHandlers[logDestination];
    if (!handler) continue;

    const mapping = keyMappings[logDestination];
    const dataToLog = mapping ? {} : rawDataToLog;

    if (mapping) {
      for (const key in rawDataToLog) {
        const mappedKey = mapping[key] || key;
        dataToLog[mappedKey] = rawDataToLog[key];
      }
    }

    handler(dataToLog);
  }
}

function logConsole(dataToLog) {
  logToConsole(JSON.stringify(dataToLog));
}

function logToBigQuery(dataToLog) {
  const connectionInfo = {
    projectId: data.logBigQueryProjectId,
    datasetId: data.logBigQueryDatasetId,
    tableId: data.logBigQueryTableId
  };

  dataToLog.timestamp = getTimestampMillis();

  ['request_body', 'response_headers', 'response_body'].forEach((p) => {
    dataToLog[p] = JSON.stringify(dataToLog[p]);
  });

  BigQuery.insert(connectionInfo, [dataToLog], { ignoreUnknownValues: true });
}

function determinateIsLoggingEnabled() {
  const containerVersion = getContainerVersion();
  const isDebug = !!(
    containerVersion &&
    (containerVersion.debugMode || containerVersion.previewMode)
  );

  if (!data.logType) {
    return isDebug;
  }

  if (data.logType === 'no') {
    return false;
  }

  if (data.logType === 'debug') {
    return isDebug;
  }

  return data.logType === 'always';
}

function determinateIsLoggingEnabledForBigQuery() {
  if (data.bigQueryLogType === 'no') return false;
  return data.bigQueryLogType === 'always';
}
