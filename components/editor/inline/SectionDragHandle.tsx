'use client'

import { GripVertical } from 'lucide-react'

interface SectionDragHandleProps {
  position: { top: number; left: number }
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void
  onDragEnd: () => void
  isDragging: boolean
}

export function SectionDragHandle({
  position,
  onDragStart,
  isDragging,
}: SectionDragHandleProps) {
  return (
    <div
      className={`
        fixed z-[99999] flex items-center justify-center
        w-6 h-8 bg-blue-500 rounded-r-md cursor-grab
        transition-opacity duration-150
        ${isDragging ? 'opacity-100 cursor-grabbing' : 'opacity-80 hover:opacity-100'}
      `}
      style={{
        top: position.top,
        left: position.left - 24,
      }}
      onMouseDown={onDragStart}
      onTouchStart={onDragStart}
    >
      <GripVertical className="w-4 h-4 text-white" />
    </div>
  )
}

/**
 * Script to inject into iframe for section drag & drop
 * Adds drag handles to sections and handles reordering
 */
export const sectionDragScript = `
  (function() {
    // Track dragging state
    let draggedSection = null;
    let dragHandle = null;
    let placeholder = null;
    let sections = [];
    let initialY = 0;
    let offsetY = 0;

    // Section selectors (top-level content blocks)
    const SECTION_SELECTORS = 'body > section, body > div, body > article, body > main > section, body > main > div, main > section, main > div';

    function init() {
      // Find all sections
      updateSections();

      // Create drag handle element
      dragHandle = document.createElement('div');
      dragHandle.id = 'unicorn-drag-handle';
      dragHandle.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>';
      dragHandle.style.cssText = 'position:fixed;display:none;width:24px;height:32px;background:#3b82f6;border-radius:0 6px 6px 0;cursor:grab;z-index:99999;align-items:center;justify-content:center;color:white;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
      document.body.appendChild(dragHandle);

      // Create placeholder
      placeholder = document.createElement('div');
      placeholder.id = 'unicorn-drop-placeholder';
      placeholder.style.cssText = 'display:none;height:4px;background:#3b82f6;margin:8px 0;border-radius:2px;';

      // Add event listeners
      document.addEventListener('mouseover', handleMouseOver);
      document.addEventListener('mouseout', handleMouseOut);
      dragHandle.addEventListener('mousedown', handleDragStart);
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    }

    function updateSections() {
      sections = Array.from(document.querySelectorAll(SECTION_SELECTORS))
        .filter(el => {
          // Filter out tiny elements and unicorn elements
          if (el.id && el.id.startsWith('unicorn-')) return false;
          const rect = el.getBoundingClientRect();
          return rect.height > 50;
        });
    }

    function getSectionAt(y) {
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (y >= rect.top && y <= rect.bottom) {
          return section;
        }
      }
      return null;
    }

    function handleMouseOver(e) {
      if (draggedSection) return;

      const section = e.target.closest(SECTION_SELECTORS);
      if (section && sections.includes(section)) {
        showDragHandle(section);
      }
    }

    function handleMouseOut(e) {
      if (draggedSection) return;

      // Check if we're still in a section
      const relatedTarget = e.relatedTarget;
      if (relatedTarget && relatedTarget.closest && relatedTarget.closest(SECTION_SELECTORS)) {
        return;
      }
      if (relatedTarget === dragHandle || dragHandle.contains(relatedTarget)) {
        return;
      }

      hideDragHandle();
    }

    function showDragHandle(section) {
      const rect = section.getBoundingClientRect();
      dragHandle.style.display = 'flex';
      dragHandle.style.left = (rect.left - 24) + 'px';
      dragHandle.style.top = (rect.top + rect.height / 2 - 16) + 'px';
      dragHandle.dataset.sectionIndex = sections.indexOf(section);
    }

    function hideDragHandle() {
      if (!draggedSection) {
        dragHandle.style.display = 'none';
      }
    }

    function handleDragStart(e) {
      e.preventDefault();

      const index = parseInt(dragHandle.dataset.sectionIndex, 10);
      if (isNaN(index) || index < 0) return;

      draggedSection = sections[index];
      if (!draggedSection) return;

      initialY = e.clientY;
      const rect = draggedSection.getBoundingClientRect();
      offsetY = e.clientY - rect.top;

      // Style dragged section
      draggedSection.style.opacity = '0.5';
      draggedSection.style.transition = 'none';

      // Insert placeholder
      draggedSection.parentNode.insertBefore(placeholder, draggedSection);
      placeholder.style.display = 'block';
      placeholder.style.height = rect.height + 'px';

      dragHandle.style.cursor = 'grabbing';
      document.body.style.cursor = 'grabbing';
    }

    function handleDragMove(e) {
      if (!draggedSection) return;

      e.preventDefault();

      // Find target position
      const targetSection = getSectionAt(e.clientY);

      if (targetSection && targetSection !== draggedSection && targetSection !== placeholder) {
        const rect = targetSection.getBoundingClientRect();
        const middle = rect.top + rect.height / 2;

        if (e.clientY < middle) {
          // Insert before
          targetSection.parentNode.insertBefore(placeholder, targetSection);
        } else {
          // Insert after
          targetSection.parentNode.insertBefore(placeholder, targetSection.nextSibling);
        }
      }

      // Update handle position
      dragHandle.style.top = (e.clientY - 16) + 'px';
    }

    function handleDragEnd(e) {
      if (!draggedSection) return;

      // Move section to placeholder position
      placeholder.parentNode.insertBefore(draggedSection, placeholder);

      // Clean up
      draggedSection.style.opacity = '';
      draggedSection.style.transition = '';
      placeholder.style.display = 'none';
      dragHandle.style.cursor = 'grab';
      document.body.style.cursor = '';

      // Notify parent
      const newIndex = Array.from(draggedSection.parentNode.children).indexOf(draggedSection);
      window.parent.postMessage({
        type: 'section-reordered',
        html: document.documentElement.outerHTML
      }, '*');

      draggedSection = null;
      updateSections();
      hideDragHandle();
    }

    // Initialize
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();
`
