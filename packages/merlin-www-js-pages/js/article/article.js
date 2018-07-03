'use strict';

import {
    addEvent,
    debounce,
    getWindowScrollTop,
    throttle
} from '@cnbritain/merlin-www-js-utils/js/functions';
import Nav from '@cnbritain/merlin-www-main-navigation';
import {
    ArticleManager
} from '@cnbritain/merlin-www-article';
import {
    isArticleGallery
} from '@cnbritain/merlin-www-article/js/utils';
import {
    getStorage
} from '../utils.js';

var articleGallery = null;
var windowHeightHalf = window.innerHeight / 2;

export default function init() {

    ArticleManager.on('focus', onArticleFocus);
    ArticleManager.on('blur', onArticleBlur);
    ArticleManager.on('imagefocus', onGalleryImageFocus);
    if (getStorage('infinite_stop') === true) {
        ArticleManager.disableInfiniteScroll();
    } else {
        ArticleManager.enableInfiniteScroll();
    }

    var articleEl = document.querySelector('.a-main');
    var simplereachConfig = null;
    if (window.__reach_config) {
        simplereachConfig = window.__reach_config;
    }

    ArticleManager.add(articleEl, {
        'ads': getStorage('ad_config'),
        'analytics': getStorage('anal_config'),
        'infinite': false,
        'simplereach': simplereachConfig
    });

    if (Nav.galleryNav !== null) {
        Nav.galleryNav.on('viewchange', onNavigationViewChange);
    }

    addEvent(window, 'scroll', throttle(onWindowScroll, 100));
    addEvent(window, 'resize', debounce(onWindowResize, 200));

}

export function onArticleBlur(e) {
    if (isArticleGallery(e.target)) {
        articleGallery = null;
    }
}

export function onArticleFocus(e) {

    var article = e.target;
    var isGallery = isArticleGallery(article);

    if (isGallery) {
        var gallery = article.gallery;

        if (gallery.layoutView === 'list') {
            Nav.galleryNav.showListView();
        }

        else {
            Nav.galleryNav.hideListView();
        }

        Nav.galleryNav.setTitle(article.properties.title);
        Nav.galleryNav.setCurrent(1);
        Nav.galleryNav.setTotal(article.gallery.imageElements.length);

        articleGallery = article;
    }

}

export function onGalleryImageFocus(e) {
    Nav.galleryNav.setCurrent(e.imageIndex + 1);
}

export function onNavigationViewChange(e) {
    if (articleGallery === null) return;

    if (e.view === 'grid') {
        articleGallery.gallery.displayThumbnailView();
    }

    else {
        articleGallery.gallery.displayListView();
    }

    ArticleManager.resize(0);
}

export function onWindowResize() {
    windowHeightHalf = window.innerHeight / 2;
}

export function onWindowScroll() {
    if (articleGallery === null) return;

    var scrollY = getWindowScrollTop();

    if (Nav.scrollDirection == 'up') {
        Nav.hideGallery();
        return;
    }

    if (articleGallery.gallery.bounds.top > scrollY + windowHeightHalf) {
        Nav.unpause();
        Nav.hideGallery();
        return;
    }

    if (articleGallery.gallery.bounds.bottom < scrollY + windowHeightHalf) {
        Nav.unpause();
        Nav.hideGallery();
        return;
    }

    Nav.pause();
    Nav.show();

    Nav.showGallery();
}