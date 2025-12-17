'use client'

/**
 * Script to inject into iframe for visual spacing editing
 * Adds drag handles for margin/padding adjustment
 */
export const spacingHandlesScript = `
  (function() {
    let activeHandle = null;
    let activeElement = null;
    let startY = 0;
    let startX = 0;
    let startValue = 0;
    let spacingType = ''; // 'margin' or 'padding'
    let spacingSide = ''; // 'top', 'right', 'bottom', 'left'

    // Tailwind spacing scale
    const SPACING_SCALE = [0,1,2,4,6,8,10,12,14,16,20,24,28,32,36,40,44,48,56,64,80,96,112,128,144,160,176,192,208,224,240,256,288,320,384];
    const SPACING_CLASSES = ['0','px','0.5','1','1.5','2','2.5','3','3.5','4','5','6','7','8','9','10','11','12','14','16','20','24','28','32','36','40','44','48','52','56','60','64','72','80','96'];

    function findNearestSpacing(pixels) {
      let closest = SPACING_SCALE[0];
      let minDiff = Math.abs(pixels - closest);
      let idx = 0;

      for (let i = 0; i < SPACING_SCALE.length; i++) {
        const diff = Math.abs(pixels - SPACING_SCALE[i]);
        if (diff < minDiff) {
          minDiff = diff;
          closest = SPACING_SCALE[i];
          idx = i;
        }
      }

      return { pixels: closest, className: SPACING_CLASSES[idx] || '0' };
    }

    // Create spacing handles container
    let handlesContainer = null;
    const handles = {
      marginTop: null, marginRight: null, marginBottom: null, marginLeft: null,
      paddingTop: null, paddingRight: null, paddingBottom: null, paddingLeft: null
    };

    function init() {
      // Create container
      handlesContainer = document.createElement('div');
      handlesContainer.id = 'unicorn-spacing-handles';
      handlesContainer.style.cssText = 'position:absolute;pointer-events:none;z-index:99998;';
      document.body.appendChild(handlesContainer);

      // Create handles
      const handleStyle = 'position:absolute;pointer-events:auto;cursor:ns-resize;transition:background 0.15s;';
      const marginColor = 'rgba(251,146,60,0.6)';
      const paddingColor = 'rgba(34,197,94,0.6)';
      const handleSize = 8;

      // Margin handles (outside element)
      handles.marginTop = createHandle('mt', handleStyle, marginColor, 'ns-resize');
      handles.marginBottom = createHandle('mb', handleStyle, marginColor, 'ns-resize');
      handles.marginLeft = createHandle('ml', handleStyle, marginColor, 'ew-resize');
      handles.marginRight = createHandle('mr', handleStyle, marginColor, 'ew-resize');

      // Padding handles (inside element)
      handles.paddingTop = createHandle('pt', handleStyle, paddingColor, 'ns-resize');
      handles.paddingBottom = createHandle('pb', handleStyle, paddingColor, 'ns-resize');
      handles.paddingLeft = createHandle('pl', handleStyle, paddingColor, 'ew-resize');
      handles.paddingRight = createHandle('pr', handleStyle, paddingColor, 'ew-resize');

      // Add event listeners
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);

      // Listen for selection messages
      window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'show-spacing-handles' && e.data.selector) {
          const el = document.querySelector(e.data.selector);
          if (el) showHandles(el);
        }
        if (e.data && e.data.type === 'hide-spacing-handles') {
          hideHandles();
        }
      });
    }

    function createHandle(id, style, color, cursor) {
      const handle = document.createElement('div');
      handle.id = 'unicorn-handle-' + id;
      handle.dataset.handleId = id;
      handle.style.cssText = style + 'background:' + color + ';cursor:' + cursor + ';';
      handle.addEventListener('mousedown', handleDragStart);
      handle.addEventListener('mouseenter', function() { handle.style.background = color.replace('0.6', '0.9'); });
      handle.addEventListener('mouseleave', function() { if (activeHandle !== handle) handle.style.background = color; });
      handlesContainer.appendChild(handle);
      return handle;
    }

    function showHandles(element) {
      activeElement = element;
      if (!handlesContainer) return;

      const rect = element.getBoundingClientRect();
      const cs = window.getComputedStyle(element);
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;

      const m = {
        top: parseInt(cs.marginTop) || 0,
        right: parseInt(cs.marginRight) || 0,
        bottom: parseInt(cs.marginBottom) || 0,
        left: parseInt(cs.marginLeft) || 0
      };
      const p = {
        top: parseInt(cs.paddingTop) || 0,
        right: parseInt(cs.paddingRight) || 0,
        bottom: parseInt(cs.paddingBottom) || 0,
        left: parseInt(cs.paddingLeft) || 0
      };

      // Position container
      handlesContainer.style.display = 'block';

      const handleSize = 8;
      const handleLength = 32;

      // Margin Top
      handles.marginTop.style.left = (rect.left + scrollX + rect.width/2 - handleLength/2) + 'px';
      handles.marginTop.style.top = (rect.top + scrollY - m.top - handleSize/2) + 'px';
      handles.marginTop.style.width = handleLength + 'px';
      handles.marginTop.style.height = handleSize + 'px';
      handles.marginTop.style.display = m.top > 2 ? 'block' : 'none';

      // Margin Bottom
      handles.marginBottom.style.left = (rect.left + scrollX + rect.width/2 - handleLength/2) + 'px';
      handles.marginBottom.style.top = (rect.bottom + scrollY + m.bottom - handleSize/2) + 'px';
      handles.marginBottom.style.width = handleLength + 'px';
      handles.marginBottom.style.height = handleSize + 'px';
      handles.marginBottom.style.display = m.bottom > 2 ? 'block' : 'none';

      // Margin Left
      handles.marginLeft.style.left = (rect.left + scrollX - m.left - handleSize/2) + 'px';
      handles.marginLeft.style.top = (rect.top + scrollY + rect.height/2 - handleLength/2) + 'px';
      handles.marginLeft.style.width = handleSize + 'px';
      handles.marginLeft.style.height = handleLength + 'px';
      handles.marginLeft.style.display = m.left > 2 ? 'block' : 'none';

      // Margin Right
      handles.marginRight.style.left = (rect.right + scrollX + m.right - handleSize/2) + 'px';
      handles.marginRight.style.top = (rect.top + scrollY + rect.height/2 - handleLength/2) + 'px';
      handles.marginRight.style.width = handleSize + 'px';
      handles.marginRight.style.height = handleLength + 'px';
      handles.marginRight.style.display = m.right > 2 ? 'block' : 'none';

      // Padding Top
      handles.paddingTop.style.left = (rect.left + scrollX + rect.width/2 - handleLength/2) + 'px';
      handles.paddingTop.style.top = (rect.top + scrollY + handleSize/2) + 'px';
      handles.paddingTop.style.width = handleLength + 'px';
      handles.paddingTop.style.height = handleSize + 'px';
      handles.paddingTop.style.display = p.top > 2 ? 'block' : 'none';

      // Padding Bottom
      handles.paddingBottom.style.left = (rect.left + scrollX + rect.width/2 - handleLength/2) + 'px';
      handles.paddingBottom.style.top = (rect.bottom + scrollY - p.bottom - handleSize/2) + 'px';
      handles.paddingBottom.style.width = handleLength + 'px';
      handles.paddingBottom.style.height = handleSize + 'px';
      handles.paddingBottom.style.display = p.bottom > 2 ? 'block' : 'none';

      // Padding Left
      handles.paddingLeft.style.left = (rect.left + scrollX + handleSize/2) + 'px';
      handles.paddingLeft.style.top = (rect.top + scrollY + rect.height/2 - handleLength/2) + 'px';
      handles.paddingLeft.style.width = handleSize + 'px';
      handles.paddingLeft.style.height = handleLength + 'px';
      handles.paddingLeft.style.display = p.left > 2 ? 'block' : 'none';

      // Padding Right
      handles.paddingRight.style.left = (rect.right + scrollX - p.right - handleSize/2) + 'px';
      handles.paddingRight.style.top = (rect.top + scrollY + rect.height/2 - handleLength/2) + 'px';
      handles.paddingRight.style.width = handleSize + 'px';
      handles.paddingRight.style.height = handleLength + 'px';
      handles.paddingRight.style.display = p.right > 2 ? 'block' : 'none';
    }

    function hideHandles() {
      if (handlesContainer) {
        handlesContainer.style.display = 'none';
      }
      activeElement = null;
    }

    function handleDragStart(e) {
      e.preventDefault();
      e.stopPropagation();

      activeHandle = e.target;
      startY = e.clientY;
      startX = e.clientX;

      const handleId = activeHandle.dataset.handleId;

      // Determine type and side from handle ID
      if (handleId.startsWith('m')) {
        spacingType = 'margin';
      } else {
        spacingType = 'padding';
      }

      spacingSide = handleId.slice(1); // t, r, b, l
      const sideMap = { t: 'top', r: 'right', b: 'bottom', l: 'left' };
      spacingSide = sideMap[spacingSide] || 'top';

      // Get current value
      if (activeElement) {
        const cs = window.getComputedStyle(activeElement);
        const prop = spacingType + spacingSide.charAt(0).toUpperCase() + spacingSide.slice(1);
        startValue = parseInt(cs[prop]) || 0;
      }

      document.body.style.cursor = activeHandle.style.cursor;
      activeHandle.style.background = activeHandle.style.background.replace('0.6', '1');
    }

    function handleDragMove(e) {
      if (!activeHandle || !activeElement) return;

      e.preventDefault();

      // Calculate delta based on direction
      let delta = 0;
      if (spacingSide === 'top' || spacingSide === 'bottom') {
        delta = spacingSide === 'top' ? startY - e.clientY : e.clientY - startY;
      } else {
        delta = spacingSide === 'left' ? startX - e.clientX : e.clientX - startX;
      }

      // Calculate new value
      let newValue = Math.max(0, startValue + delta);

      // Snap to Tailwind scale
      const snapped = findNearestSpacing(newValue);

      // Update class
      updateSpacingClass(activeElement, spacingType, spacingSide, snapped.className);

      // Show preview
      showHandles(activeElement);
    }

    function handleDragEnd(e) {
      if (!activeHandle) return;

      document.body.style.cursor = '';
      activeHandle.style.background = activeHandle.style.background.replace('1)', '0.6)');

      // Notify parent of change
      if (activeElement) {
        window.parent.postMessage({
          type: 'spacing-changed',
          selector: getSelector(activeElement),
          className: activeElement.className,
          html: document.documentElement.outerHTML
        }, '*');
      }

      activeHandle = null;
    }

    function updateSpacingClass(element, type, side, newValue) {
      const prefix = type === 'margin' ? 'm' : 'p';
      const sideChar = side.charAt(0); // t, r, b, l
      const classPrefix = prefix + sideChar + '-';

      // Remove existing class for this property
      const classes = element.className.split(/\\s+/);
      const filtered = classes.filter(c => !c.match(new RegExp('^-?' + classPrefix)));

      // Add new class
      filtered.push(classPrefix + newValue);

      element.className = filtered.join(' ');
    }

    function getSelector(el) {
      var path = [];
      while (el && el !== document.body && el !== document.documentElement) {
        var selector = el.tagName.toLowerCase();
        if (el.id) {
          selector = '#' + el.id;
          path.unshift(selector);
          break;
        }
        if (el.parentElement) {
          var siblings = Array.from(el.parentElement.children).filter(function(c) {
            return c.tagName === el.tagName;
          });
          if (siblings.length > 1) {
            var index = siblings.indexOf(el) + 1;
            selector += ':nth-of-type(' + index + ')';
          }
        }
        path.unshift(selector);
        el = el.parentElement;
      }
      return path.join(' > ');
    }

    // Initialize
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();
`
