/*!
 * "position: sticky" jQuery plugin / polyfill
 * https://github.com/podkot/i-sticky
 * License: MIT
 */
(function ($) {
    var prefixTestList = ['', '-webkit-', '-ms-', '-moz-', '-o-'],
        stickyTestElement = document.createElement('div'),
        lastKnownScrollTop  = 0,
        lastKnownScrollLeft = 0,
        waitingForUpdate = false,
        // requestAnimationFrame may be prefixed
        requestAnimationFrame = window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame,
        slice = Array.prototype.slice,
        stickyId = 0,
        toObserve = [],
        methods = {
            unstick : function() {
                var currentId = $(this).data('stickyId'),
                    removeIndex,
                    unstickEl;

                for (var i = toObserve.length - 1; i >= 0; i--) {
                    if ( toObserve[i].stickyId == currentId )
                        removeIndex = i;
                };

                if ( typeof removeIndex !== 'undefined' )
                    unstickEl = toObserve.splice(removeIndex, 1);

                if ( typeof unstickEl !== 'undefined' )
                    $(this).removeAttr('style').next( '.' + unstickEl[0].holderClass ).remove();

                return this;
            }
        };

    // fix ff bug
    $.fn.iSticky = function(){
        return this;
    };

    for (var i = 0, l = prefixTestList.length; i < l; i++) {
        stickyTestElement.setAttribute( 'style', 'position:' + prefixTestList[i] + 'sticky' );

        if (stickyTestElement.style.position !== '') {
            return;
        }
    }

    $.fn.iSticky = function(methodOrOptions){
        if ( typeof methodOrOptions == 'string' && methods[methodOrOptions] )
            return methods[ methodOrOptions ].apply( this, Array.prototype.slice.call( arguments, 1 ))

        var options = $.extend({
            holderClass:      'i-sticky__holder',
            holderAutoHeight: false
        }, methodOrOptions);

        return this.each(function(){
            var $this    = $(this),
                style    = '',
                absStyle = '',
                topCSSstring,
                topCSS,
                bottomCSSstring,
                bottomCSS,
                marginLeft = parseInt( $this.css('margin-left'), 10 ),
                elStickyId = 'stycki_' + (++stickyId);

            // 'auto' value workaround
            // http://stackoverflow.com/questions/13455931/jquery-css-firefox-dont-return-auto-values
            $this.hide();

            topCSSstring    = $this.css('top');
            bottomCSSstring = $this.css('bottom');

            $this.show();

            if ( topCSSstring !== 'auto' ) {
                style  = 'top:' + topCSSstring + ';bottom:auto;';
                oppositeStyle = 'top:auto;bottom:0;';
                topCSS = parseInt( topCSSstring, 10 );
            }
            else if ( bottomCSSstring !== 'auto' ) {
                style     = 'top:auto;bottom:' + bottomCSSstring + ';';
                oppositeStyle = 'top:0;bottom:auto;';
                bottomCSS = parseInt( bottomCSSstring, 10 );
            }
            else {
                return;
            }

            $this
                .data('stickyId', elStickyId)
                .after('<span class="' + options.holderClass+ '" style="display:block;"></span>');

            toObserve.push({
                style:            style,
                oppositeStyle:    oppositeStyle,
                topCSS:           topCSS,
                bottomCSS:        bottomCSS,
                el:               this,
                parent:           this.parentElement,
                fixed:            false,
                holder:           this.nextSibling,
                holderClass:      options.holderClass,
                holderAutoHeight: options.holderAutoHeight,
                marginLeft:       marginLeft,
                height:           0,
                stickyId:         elStickyId,
                init:             true
            });

            updateScrollPos();
        });

    };

    function getOffset(elem) {
        var docElem,
            body,
            win,
            clientTop,
            clientLeft,
            scrollTop,
            scrollLeft,
            box = {
                top:  0,
                left: 0
            },
            doc = elem && elem.ownerDocument;

        if ( !doc ) {
            return;
        }

        if ( ( body = doc.body ) === elem ) {
            return {
                top: body.offsetTop,
                left: body.offsetLeft
            };
        }

        docElem = doc.documentElement;

        if ( typeof elem.getBoundingClientRect !== "undefined" ) {
            box = elem.getBoundingClientRect();
        }

        win = window;
        clientTop = docElem.clientTop || body.clientTop || 0;
        clientLeft = docElem.clientLeft || body.clientLeft || 0;
        scrollTop = win.pageYOffset || docElem.scrollTop;
        scrollLeft = win.pageXOffset || docElem.scrollLeft;

        return {
            top: box.top + scrollTop - clientTop,
            left: box.left + scrollLeft - clientLeft
        };
    }

    function setPositions() {
        var scrollTop    = lastKnownScrollTop,
            scrollLeft   = window.pageXOffset || document.documentElement.scrollLeft,
            windowHeight = window.innerHeight || document.documentElement.clientHeight;


        waitingForUpdate = false;

        for ( var i = 0, l = toObserve.length; i < l; i++ ) {
            var item   = toObserve[i],
                height = item.el.offsetHeight,

                parOff    = getOffset(item.parent),
                parOffTop = ((parOff !== null && parOff.top !== null) ? parOff.top : 0),
                elmOff    = getOffset(item.el),
                elmOffTop = ((elmOff !== null && elmOff.top !== null) ? elmOff.top : 0),

                start,
                end,
                fix,
                home,
                opposite;

            if ( typeof item.topCSS !== 'undefined' ) {
                start  = parOffTop - item.topCSS;
                end    = parOffTop + item.parent.offsetHeight - height - item.topCSS;

                fix      = scrollTop > start && scrollTop < end;
                home     = scrollTop <= start;
                opposite = start != end && scrollTop >= end;
            }
            else if ( typeof item.bottomCSS !== 'undefined' ) {
                var scrollBottom = scrollTop + windowHeight;

                start  = parOffTop + height - item.bottomCSS;
                end    = parOffTop + item.parent.offsetHeight - item.bottomCSS;

                fix      = scrollBottom > start && scrollBottom < end;
                home     = scrollBottom >= end;
                opposite = start != end && scrollBottom <= start;
            }
            else {
                continue;
            }

            var margin = 'margin-left:-' + ( scrollLeft - item.marginLeft ) + 'px',
                fixCSS      = item.style + 'position:fixed;' + margin,
                oppositeCSS = item.oppositeStyle + 'position:absolute;',
                homeCSS     = item.style + 'position:absolute;';

            if ( item.holderAutoHeight && height != item.height ) {
                item.holder.setAttribute( 'style', 'display:block;height:' + height + 'px;' );
                item.height = height;
            }

            if ( fix ) {
                if ( ! item.fixed || scrollLeft != lastKnownScrollLeft ) {
                    item.el.setAttribute( 'style', fixCSS );
                    item.fixed = true;
                }
            }
            else if ( item.fixed === true || item.init ) {
                if ( home ) {
                    item.el.setAttribute( 'style', homeCSS );
                    item.fixed = false;
                }
                else if ( opposite ) {
                    item.el.setAttribute( 'style', oppositeCSS );
                    item.fixed = false;
                }
            }

            if ( item.init ) {
                delete item.init;
            }
        }

        lastKnownScrollLeft = scrollLeft;
    }

    var timeout;
    // Debounced scroll handling
    function updateScrollPos() {
        lastKnownScrollTop = document.documentElement.scrollTop || document.body.scrollTop;

        // Only trigger a layout change if we’re not already waiting for one
        if ( ! waitingForUpdate ) {
            waitingForUpdate = true;

            // Don’t update until next animation frame if we can, otherwise use a
            // timeout - either will help avoid too many repaints
            if ( requestAnimationFrame ) {
                requestAnimationFrame( setPositions );
            }
            else {
                if ( timeout ) {
                    clearTimeout( timeout );
                }

                timeout = setTimeout( setPositions, 15 );
            }
        }
    }

    $(window)
        .on('scroll', updateScrollPos)
        .on('resize', updateScrollPos);

})(jQuery);
