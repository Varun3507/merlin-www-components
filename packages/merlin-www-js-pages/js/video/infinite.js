'use strict';

import {
    addEvent,
    addHtml,
    onPageLoad,
    removeEvent,
    throttle,
    updateQueryString,
    locationOrigin
} from '@cnbritain/merlin-www-js-utils/js/functions';
import { AdManager } from '@cnbritain/merlin-www-ads';
import InfiniteScroll from '@cnbritain/merlin-www-js-infinitescroll';
import SectionCardList from '@cnbritain/merlin-www-section-card-list';
import OneTrustManager from '@cnbritain/merlin-www-js-gatracker/js/OneTrustManager';

import { nativeAdShift, nativeAdWaiting } from './ads';
import { createStickGroup } from './sticky';
import { getStorage, setStorage } from '../utils';

var INFINITE_BOTTOM_THRESHOLD = 1000;
var INFINITE_SCROLL_THROTTLE = 300;
var INFINITE_RESIZE_THROTTLE = 300;
var infiniteScroller = null;
var infiniteBodyScrollHeight = 0;
var hookInfiniteResize = null;

export default function init() {
    infiniteScroller = new InfiniteScroll({
        el: window,
        throttle: INFINITE_SCROLL_THROTTLE,
        trigger: onInfiniteTrigger,
        url: onInfiniteUrl
    });
    infiniteScroller.on('loadError', onInfiniteLoadError);
    infiniteScroller.on('loadComplete', onInfiniteLoadComplete);

    resize();
    onPageLoad(resize);
    hookInfiniteResize = throttle(resize, INFINITE_RESIZE_THROTTLE);
    addEvent(window, 'resize', hookInfiniteResize);

    infiniteScroller.enable();
}

export function resize() {
    infiniteBodyScrollHeight = document.body.scrollHeight - window.innerHeight;
}

export function onInfiniteTrigger(scrollY) {
    return (
        nativeAdWaiting === 0 &&
        scrollY >= infiniteBodyScrollHeight - INFINITE_BOTTOM_THRESHOLD
    );
}

export function getNextPageUrl(pageUrl, pageNumber, itemShift) {
    var adInstanceCounts = getStorage('ad_instance_counts');

    var url = updateQueryString(pageUrl, {
        page: pageNumber,
        shift: itemShift,
        ad_instance_counts: adInstanceCounts
    });
    return url;
}

export function onInfiniteUrl(pageCounter) {
    return (
        locationOrigin() +
        getNextPageUrl(
            getStorage('infinite_url'),
            pageCounter + 1,
            nativeAdShift
        )
    );
}

export function destroyInfiniteScroller() {
    infiniteScroller.destroy();
    removeEvent(window, 'resize', hookInfiniteResize);

    infiniteScroller = null;
    hookInfiniteResize = null;
}

export function throwInfiniteError(message, e) {
    destroyInfiniteScroller();
    throw new Error(message, e);
}

export function onInfiniteLoadError(e) {
    throwInfiniteError('Error trying to load url in infinite scroll', e);
}

export function insertSection(section) {
    var docFragment = document.createDocumentFragment();
    var addToFragment = addHtml(docFragment);

    addToFragment(section);

    var hook = document.getElementById('infiniteScrollHook');
    hook.parentNode.insertBefore(docFragment, hook);
    createStickGroup(docFragment.querySelector('.stick-group'));

    addToFragment = null;
    hook = null;
    docFragment = null;
}

export function onInfiniteLoadComplete(e) {
    var responseText = e.originalRequest.responseText;
    var responseJSON = null;
    try {
        responseJSON = JSON.parse(responseText);
    } catch (err) {
        throwInfiniteError('Error trying to parse response JSON', err);
    }

    // Add items to page
    if (responseJSON.data.template) insertSection(responseJSON.data.template);

    // Check if we need to stop
    if (responseJSON.data.stop) destroyInfiniteScroller();

    SectionCardList.init();

    if (OneTrustManager.ready && OneTrustManager.consentedPerformanceCookies) {
        AdManager.lazy();
    }

    // TODO: Page impression tracker
    resize();
}
