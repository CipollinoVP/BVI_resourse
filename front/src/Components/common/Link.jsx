import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

const isHashHref = (value) => {
  return typeof value === 'string' && (value.startsWith('#') || value.startsWith('/#')) && value.length > 1;
};

const scrollToTarget = (target) => {
  if (typeof window === 'undefined') return;
  window.scrollTo({
    top: target === 'bottom' ? document.body.scrollHeight : 0,
    behavior: 'smooth',
  });
};

const scrollToAnchor = (hash) => {
  if (typeof document === 'undefined') return;
  const id = hash.startsWith('/#') ? hash.slice(2) : hash.startsWith('#') ? hash.slice(1) : hash;
  let element = document.getElementById(id);
  if (!element) return;
  const isInSidebar = element.closest('.section-sidebar-injected-wrapper');
  if (isInSidebar) {
    const allElements = document.querySelectorAll(`[id="${id}"]`);
    for (const el of allElements) {
      if (!el.closest('.section-sidebar-injected-wrapper')) {
        element = el;
        break;
      }
    }
  }
  const rect = element.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const elementTop = rect.top + scrollTop;
  const headerOffset = 80;
  const targetPosition = elementTop - headerOffset;
  window.scrollTo({ top: targetPosition, behavior: 'smooth' });
};

export const Link = React.forwardRef(({ to, href, newTab = false, scroll, target, rel, onClick, children, ...rest }, ref) => {
  const finalTarget = newTab ? (target ?? '_blank') : target;
  const finalRel = newTab ? (rel ?? 'noopener noreferrer') : rel;

  // Handle hash routes in 'to' prop
  if (isHashHref(to)) {
    const hrefStr = typeof to === 'string' ? to : '';
    const handleHashClick = (e) => {
      e.preventDefault();
      scrollToAnchor(hrefStr);
      onClick?.(e);
    };
    return (
      <a
        ref={ref}
        href={hrefStr}
        onClick={handleHashClick}
        data-link-type='section'
        data-link-href={hrefStr.startsWith('/#') ? hrefStr.slice(2) : hrefStr.slice(1)}
        {...rest}
      >
        {children}
      </a>
    );
  }

  if (to !== undefined && to !== null && to !== '') {
    return (
      <RouterLink
        ref={ref}
        to={to}
        target={finalTarget}
        rel={finalRel}
        onClick={onClick}
        data-link-type='route'
        data-link-href={typeof to === 'string' ? to : undefined}
        data-link-target={finalTarget}
        {...rest}
      >
        {children}
      </RouterLink>
    );
  }

  if (href !== undefined && href !== null && href !== '') {
    const hrefStr = typeof href === 'string' ? href : '';
    const isInPageAnchor = isHashHref(hrefStr);
    const handleAnchorClick = (e) => {
      if (isInPageAnchor) {
        e.preventDefault();
        scrollToAnchor(hrefStr);
      }
      onClick?.(e);
    };
    return (
      <a
        ref={ref}
        href={hrefStr}
        target={isInPageAnchor ? undefined : finalTarget}
        rel={isInPageAnchor ? undefined : finalRel}
        onClick={handleAnchorClick}
        data-link-type={isInPageAnchor ? 'section' : 'url'}
        data-link-href={isInPageAnchor ? hrefStr.slice(1) : hrefStr}
        data-link-target={isInPageAnchor ? undefined : finalTarget}
        {...rest}
      >
        {children}
      </a>
    );
  }

  if (scroll === 'top' || scroll === 'bottom') {
    const handleScrollClick = (e) => {
      e.preventDefault();
      scrollToTarget(scroll);
      onClick?.(e);
    };
    return (
      <a
        ref={ref}
        role='button'
        onClick={handleScrollClick}
        data-link-type='scroll'
        data-link-href={scroll}
        {...rest}
      >
        {children}
      </a>
    );
  }

  return <>{children}</>;
});

Link.displayName = 'Link';