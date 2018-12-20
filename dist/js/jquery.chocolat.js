"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

;

(function (factory) {
  if ((typeof module === "undefined" ? "undefined" : _typeof(module)) === 'object' && _typeof(module.exports) === 'object') {
    module.exports = factory(require('jquery'), window, document);
  } else {
    factory(jQuery, window, document);
  }
})(function ($, window, document, undefined) {
  var calls = 0;

  function loadImage(path) {
    var image = new Image();

    if ('decode' in image) {
      image.src = path;
      return image.decode();
    } else {
      return new Promise(function (resolve, reject) {
        image.onload = resolve(image);
        image.onerror = resolve;
        image.src = path;
      });
    }
  }

  function Chocolat(element, settings) {
    var that = this;
    this.settings = settings;
    this.elems = {};
    this.element = element;
    this._cssClasses = ['chocolat-open', 'chocolat-in-container', 'chocolat-cover', 'chocolat-zoomable', 'chocolat-zoomed'];

    if (!this.settings.setTitle && element.data('chocolat-title')) {
      this.settings.setTitle = element.data('chocolat-title');
    }

    this.element.find(this.settings.imageSelector).each(function () {
      that.settings.images.push({
        title: this.getAttribute('title'),
        src: this.getAttribute(that.settings.imageSource),
        height: false,
        width: false
      });
    });
    this.element.find(this.settings.imageSelector).each(function (i) {
      $(this).off('click.chocolat').on('click.chocolat', function (e) {
        that.init(i);
        e.preventDefault();
      });
    });
    return this;
  }

  $.extend(Chocolat.prototype, {
    init: function init(i) {
      if (!this.settings.initialized) {
        this.setDomContainer();
        this.markup();
        this.events();
        this.settings.lastImage = this.settings.images.length - 1;
        this.settings.initialized = true;
      }

      this.settings.afterInitialize.call(this);
      return this.load(i);
    },
    preload: function preload(i) {
      return loadImage(this.settings.images[i].src);
    },
    load: function load(i) {
      var _this = this;

      if (this.settings.fullScreen) {
        this.openFullScreen();
      }

      if (this.settings.currentImage === i) {
        return;
      }

      this.elems.overlay.fadeIn(this.settings.duration);
      this.elems.wrapper.fadeIn(this.settings.duration);
      this.elems.domContainer.addClass('chocolat-open');
      this.settings.timer = setTimeout(function () {
        if (typeof _this.elems != 'undefined') {
          $.proxy(_this.elems.loader.fadeIn(), _this);
        }
      }, this.settings.duration);
      var promise = this.preload(i).then(function (imgLoader) {
        return _this.place(i, imgLoader);
      }).then(function (imgLoader) {
        return _this.appear(i);
      }).then(function (imgLoader) {
        _this.zoomable();

        _this.settings.afterImageLoad.call(_this);
      });
      var nextIndex = i + 1;

      if (typeof this.settings.images[nextIndex] != 'undefined') {
        this.preload(nextIndex);
      }

      return promise;
    },
    place: function place(i, imgLoader) {
      var fitting;
      this.settings.currentImage = i;
      this.description();
      this.pagination();
      this.arrows();
      this.storeImgSize(imgLoader, i);
      fitting = this.fit(i, this.elems.wrapper);
      return this.center(fitting.width, fitting.height, fitting.left, fitting.top, 0);
    },
    center: function center(width, height, left, top, duration) {
      return this.elems.content.css('overflow', 'visible').animate({
        width: width,
        height: height,
        left: left,
        top: top
      }, duration).promise();
    },
    appear: function appear(i) {
      var _this2 = this;

      clearTimeout(this.settings.timer);
      this.elems.loader.stop().fadeOut(300, function () {
        _this2.elems.img[0].attr('src', _this2.settings.images[i].src);
      });
    },
    fit: function fit(i, container) {
      var height;
      var width;
      var imgHeight = this.settings.images[i].height;
      var imgWidth = this.settings.images[i].width;
      var holderHeight = $(container).height();
      var holderWidth = $(container).width();
      var holderOutMarginH = this.getOutMarginH();
      var holderOutMarginW = this.getOutMarginW();
      var holderGlobalWidth = holderWidth - holderOutMarginW;
      var holderGlobalHeight = holderHeight - holderOutMarginH;
      var holderGlobalRatio = holderGlobalHeight / holderGlobalWidth;
      var holderRatio = holderHeight / holderWidth;
      var imgRatio = imgHeight / imgWidth;

      if (this.settings.imageSize == 'cover') {
        if (imgRatio < holderRatio) {
          height = holderHeight;
          width = height / imgRatio;
        } else {
          width = holderWidth;
          height = width * imgRatio;
        }
      } else if (this.settings.imageSize == 'native') {
        height = imgHeight;
        width = imgWidth;
      } else {
        if (imgRatio > holderGlobalRatio) {
          height = holderGlobalHeight;
          width = height / imgRatio;
        } else {
          width = holderGlobalWidth;
          height = width * imgRatio;
        }

        if (this.settings.imageSize === 'default' && (width >= imgWidth || height >= imgHeight)) {
          width = imgWidth;
          height = imgHeight;
        }
      }

      return {
        height: height,
        width: width,
        top: (holderHeight - height) / 2,
        left: (holderWidth - width) / 2
      };
    },
    change: function change(signe) {
      this.zoomOut(0);
      this.zoomable();
      var requestedImage = this.settings.currentImage + parseInt(signe);

      if (requestedImage > this.settings.lastImage) {
        if (this.settings.loop) {
          return this.load(0);
        }
      } else if (requestedImage < 0) {
        if (this.settings.loop) {
          return this.load(this.settings.lastImage);
        }
      } else {
        return this.load(requestedImage);
      }
    },
    arrows: function arrows() {
      if (this.settings.loop) {
        $([this.elems.left[0], this.elems.right[0]]).addClass('active');
      } else if (this.settings.linkImages) {
        // right
        if (this.settings.currentImage == this.settings.lastImage) {
          this.elems.right.removeClass('active');
        } else {
          this.elems.right.addClass('active');
        } // left


        if (this.settings.currentImage === 0) {
          this.elems.left.removeClass('active');
        } else {
          this.elems.left.addClass('active');
        }
      } else {
        $([this.elems.left[0], this.elems.right[0]]).removeClass('active');
      }
    },
    description: function description() {
      this.elems.description.html(this.settings.images[this.settings.currentImage].title);
    },
    pagination: function pagination() {
      var last = this.settings.lastImage + 1;
      var position = this.settings.currentImage + 1;
      this.elems.pagination.html(position + ' ' + this.settings.separator2 + last);
    },
    storeImgSize: function storeImgSize(img, i) {
      if (typeof img === 'undefined') {
        return;
      }

      if (!this.settings.images[i].height || !this.settings.images[i].width) {
        this.settings.images[i].height = img.height;
        this.settings.images[i].width = img.width;
      }
    },
    close: function close() {
      var _this3 = this;

      if (this.settings.fullscreenOpen) {
        this.exitFullScreen();
        return;
      }

      var els = [this.elems.overlay[0], this.elems.loader[0], this.elems.wrapper[0]];
      var def = $.when($(els).fadeOut(200)).done(function () {
        _this3.elems.domContainer.removeClass('chocolat-open');
      });
      this.settings.currentImage = false;
      return def;
    },
    destroy: function destroy() {
      this.element.removeData();
      this.element.find(this.settings.imageSelector).off('click.chocolat');

      if (!this.settings.initialized) {
        return;
      }

      if (this.settings.fullscreenOpen) {
        this.exitFullScreen();
      }

      this.settings.currentImage = false;
      this.settings.initialized = false;
      this.elems.domContainer.removeClass(this._cssClasses.join(' '));
      this.elems.wrapper.remove();
    },
    getOutMarginW: function getOutMarginW() {
      var left = this.elems.left.outerWidth(true);
      var right = this.elems.right.outerWidth(true);
      return left + right;
    },
    getOutMarginH: function getOutMarginH() {
      return this.elems.top.outerHeight(true) + this.elems.bottom.outerHeight(true);
    },
    markup: function markup() {
      this.elems.domContainer.addClass('chocolat-open ' + this.settings.className);

      if (this.settings.imageSize == 'cover') {
        this.elems.domContainer.addClass('chocolat-cover');
      }

      if (this.settings.container !== window) {
        this.elems.domContainer.addClass('chocolat-in-container');
      }

      this.elems.wrapper = $('<div/>', {
        class: 'chocolat-wrapper',
        id: 'chocolat-content-' + this.settings.setIndex
      }).appendTo(this.elems.domContainer);
      this.elems.overlay = $('<div/>', {
        class: 'chocolat-overlay'
      }).appendTo(this.elems.wrapper);
      this.elems.loader = $('<div/>', {
        class: 'chocolat-loader'
      }).appendTo(this.elems.wrapper);
      this.elems.content = $('<div/>', {
        class: 'chocolat-content'
      }).appendTo(this.elems.wrapper);
      this.elems.img = $('<img/>', {
        class: 'chocolat-img',
        src: ''
      }).appendTo(this.elems.content);
      this.elems.top = $('<div/>', {
        class: 'chocolat-top'
      }).appendTo(this.elems.wrapper);
      this.elems.left = $('<div/>', {
        class: 'chocolat-left'
      }).appendTo(this.elems.wrapper);
      this.elems.right = $('<div/>', {
        class: 'chocolat-right'
      }).appendTo(this.elems.wrapper);
      this.elems.bottom = $('<div/>', {
        class: 'chocolat-bottom'
      }).appendTo(this.elems.wrapper);
      this.elems.close = $('<span/>', {
        class: 'chocolat-close'
      }).appendTo(this.elems.top);
      this.elems.fullscreen = $('<span/>', {
        class: 'chocolat-fullscreen'
      }).appendTo(this.elems.bottom);
      this.elems.description = $('<span/>', {
        class: 'chocolat-description'
      }).appendTo(this.elems.bottom);
      this.elems.pagination = $('<span/>', {
        class: 'chocolat-pagination'
      }).appendTo(this.elems.bottom);
      this.elems.setTitle = $('<span/>', {
        class: 'chocolat-set-title',
        html: this.settings.setTitle
      }).appendTo(this.elems.bottom);
      this.settings.afterMarkup.call(this);
    },
    openFullScreen: function openFullScreen() {
      var wrapper = this.elems.wrapper[0];

      if (wrapper.requestFullscreen) {
        this.settings.fullscreenOpen = true;
        wrapper.requestFullscreen();
      } else if (wrapper.mozRequestFullScreen) {
        this.settings.fullscreenOpen = true;
        wrapper.mozRequestFullScreen();
      } else if (wrapper.webkitRequestFullscreen) {
        this.settings.fullscreenOpen = true;
        wrapper.webkitRequestFullscreen();
      } else if (wrapper.msRequestFullscreen) {
        wrapper.msRequestFullscreen();
        this.settings.fullscreenOpen = true;
      } else {
        this.settings.fullscreenOpen = false;
      }
    },
    exitFullScreen: function exitFullScreen() {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        this.settings.fullscreenOpen = false;
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
        this.settings.fullscreenOpen = false;
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
        this.settings.fullscreenOpen = false;
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
        this.settings.fullscreenOpen = false;
      } else {
        this.settings.fullscreenOpen = true;
      }
    },
    events: function events() {
      var _this4 = this;

      $(document).off('keydown.chocolat').on('keydown.chocolat', function (e) {
        if (_this4.settings.initialized) {
          if (e.keyCode == 37) {
            _this4.change(-1);
          } else if (e.keyCode == 39) {
            _this4.change(1);
          } else if (e.keyCode == 27) {
            _this4.close();
          }
        }
      }); // this.elems.wrapper.find('.chocolat-img')
      //     .off('click.chocolat')
      //     .on('click.chocolat', function(e) {
      //         var currentImage = that.settings.images[that.settings.currentImage];
      //         if(currentImage.width > $(that.elems.wrapper).width() || currentImage.height > $(that.elems.wrapper).height() ){
      //             that.toggleZoom(e);
      //         }
      // });

      this.elems.wrapper.find('.chocolat-right').off('click.chocolat').on('click.chocolat', function () {
        _this4.change(+1);
      });
      this.elems.wrapper.find('.chocolat-left').off('click.chocolat').on('click.chocolat', function () {
        return _this4.change(-1);
      });
      $([this.elems.overlay[0], this.elems.close[0]]).off('click.chocolat').on('click.chocolat', function () {
        return _this4.close();
      });
      this.elems.fullscreen.off('click.chocolat').on('click.chocolat', function () {
        if (_this4.settings.fullscreenOpen) {
          _this4.exitFullScreen();

          return;
        }

        _this4.openFullScreen();
      });

      if (this.settings.backgroundClose) {
        this.elems.overlay.off('click.chocolat').on('click.chocolat', function () {
          return _this4.close();
        });
      }

      this.elems.wrapper.off('click.chocolat').on('click.chocolat', function (e) {
        return _this4.zoomOut(e);
      });
      this.elems.wrapper.find('.chocolat-img').off('click.chocolat').on('click.chocolat', function (e) {
        if (_this4.settings.initialZoomState === null && _this4.elems.domContainer.hasClass('chocolat-zoomable')) {
          e.stopPropagation();
          return _this4.zoomIn(e);
        }
      });
      this.elems.wrapper.mousemove(function (e) {
        if (_this4.settings.initialZoomState === null) {
          return;
        }

        if (_this4.elems.img.is(':animated')) {
          return;
        }

        var pos = $(_this4).offset();
        var height = $(_this4).height();
        var width = $(_this4).width();
        var currentImage = _this4.settings.images[_this4.settings.currentImage];
        var imgWidth = currentImage.width;
        var imgHeight = currentImage.height;
        var coord = [e.pageX - width / 2 - pos.left, e.pageY - height / 2 - pos.top];
        var mvtX = 0;

        if (imgWidth > width) {
          var paddingX = _this4.settings.zoomedPaddingX(imgWidth, width);

          mvtX = coord[0] / (width / 2);
          mvtX = ((imgWidth - width) / 2 + paddingX) * mvtX;
        }

        var mvtY = 0;

        if (imgHeight > height) {
          var paddingY = _this4.settings.zoomedPaddingY(imgHeight, height);

          mvtY = coord[1] / (height / 2);
          mvtY = ((imgHeight - height) / 2 + paddingY) * mvtY;
        }

        var animation = {
          'margin-left': -mvtX + 'px',
          'margin-top': -mvtY + 'px'
        };

        if (typeof e.duration !== 'undefined') {
          $(_this4.elems.img).stop(false, true).animate(animation, e.duration);
        } else {
          $(_this4.elems.img).stop(false, true).css(animation);
        }
      });
      $(window).on('resize', function () {
        if (!_this4.settings.initialized || _this4.settings.currentImage === false) {
          return;
        }

        _this4.debounce(50, function () {
          var fitting = _this4.fit(_this4.settings.currentImage, _this4.elems.wrapper);

          _this4.center(fitting.width, fitting.height, fitting.left, fitting.top, 0);

          _this4.zoomable();
        });
      });
    },
    zoomable: function zoomable() {
      var currentImage = this.settings.images[this.settings.currentImage];
      var wrapperWidth = this.elems.wrapper.width();
      var wrapperHeight = this.elems.wrapper.height();
      var isImageZoomable = this.settings.enableZoom && (currentImage.width > wrapperWidth || currentImage.height > wrapperHeight) ? true : false;
      var isImageStretched = this.elems.img.width() > currentImage.width || this.elems.img.height() > currentImage.height;

      if (isImageZoomable && !isImageStretched) {
        this.elems.domContainer.addClass('chocolat-zoomable');
      } else {
        this.elems.domContainer.removeClass('chocolat-zoomable');
      }
    },
    zoomIn: function zoomIn(e) {
      this.settings.initialZoomState = this.settings.imageSize;
      this.settings.imageSize = 'native';
      var event = $.Event('mousemove');
      event.pageX = e.pageX;
      event.pageY = e.pageY;
      event.duration = this.settings.duration;
      this.elems.wrapper.trigger(event);
      this.elems.domContainer.addClass('chocolat-zoomed');
      var fitting = this.fit(this.settings.currentImage, this.elems.wrapper);
      return this.center(fitting.width, fitting.height, fitting.left, fitting.top, this.settings.duration);
    },
    zoomOut: function zoomOut(e, duration) {
      if (this.settings.initialZoomState === null || this.settings.currentImage === false) {
        return;
      }

      duration = duration || this.settings.duration;
      this.settings.imageSize = this.settings.initialZoomState;
      this.settings.initialZoomState = null;
      this.elems.img.animate({
        margin: 0
      }, duration);
      this.elems.domContainer.removeClass('chocolat-zoomed');
      var fitting = this.fit(this.settings.currentImage, this.elems.wrapper);
      return this.center(fitting.width, fitting.height, fitting.left, fitting.top, duration);
    },
    setDomContainer: function setDomContainer() {
      // if container == window
      // domContainer = body
      if (this.settings.container === window) {
        this.elems.domContainer = $('body');
      } else {
        this.elems.domContainer = $(this.settings.container);
      }
    },
    debounce: function debounce(duration, callback) {
      clearTimeout(this.settings.timerDebounce);
      this.settings.timerDebounce = setTimeout(function () {
        callback();
      }, duration);
    },
    api: function api() {
      var _this5 = this;

      return {
        open: function open(i) {
          i = parseInt(i) || 0;
          return _this5.init(i);
        },
        close: function close() {
          return _this5.close();
        },
        next: function next() {
          return _this5.change(1);
        },
        prev: function prev() {
          return _this5.change(-1);
        },
        goto: function goto(i) {
          // open alias
          return _this5.open(i);
        },
        current: function current() {
          return _this5.settings.currentImage;
        },
        place: function place() {
          return _this5.place(_this5.settings.currentImage, _this5.settings.duration);
        },
        destroy: function destroy() {
          return _this5.destroy();
        },
        set: function set(property, value) {
          _this5.settings[property] = value;
          return value;
        },
        get: function get(property) {
          return _this5.settings[property];
        },
        getElem: function getElem(name) {
          return _this5.elems[name];
        }
      };
    }
  });
  var defaults = {
    container: window,
    // window or jquery object or jquery selector, or element
    imageSelector: '.chocolat-image',
    className: '',
    imageSize: 'default',
    // 'default', 'contain', 'cover' or 'native'
    initialZoomState: null,
    fullScreen: false,
    loop: false,
    linkImages: true,
    duration: 300,
    setTitle: '',
    separator2: '/',
    setIndex: 0,
    firstImage: 0,
    lastImage: false,
    currentImage: false,
    initialized: false,
    timer: false,
    timerDebounce: false,
    images: [],
    enableZoom: true,
    imageSource: 'href',
    afterInitialize: function afterInitialize() {},
    afterMarkup: function afterMarkup() {},
    afterImageLoad: function afterImageLoad() {},
    zoomedPaddingX: function zoomedPaddingX(canvasWidth, imgWidth) {
      return 0;
    },
    zoomedPaddingY: function zoomedPaddingY(canvasHeight, imgHeight) {
      return 0;
    }
  };

  $.fn.Chocolat = function (options) {
    return this.each(function () {
      calls++;
      var settings = $.extend(true, {}, defaults, options, {
        setIndex: calls
      });

      if (!$.data(this, 'chocolat')) {
        $.data(this, 'chocolat', new Chocolat($(this), settings));
      }
    });
  };

  return $.fn.Chocolat;
});