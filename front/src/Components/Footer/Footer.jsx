"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Clock, Mail, MapPin, Phone } from "lucide-react";

import { Link } from "../common/Link";
import { Separator } from "../common/separator";
import { WvcLogo } from "../common/WcvLogo";
import { useAuth } from '../../context/AuthContext';
import { MenuProvider, useMenu } from "../common/WordPressMenuProvider";


function FooterMenuTree({ items, level = 0 }) {
  if (!items || items.length === 0) return null;

  return (
    <ul className={level === 0 ? "space-y-2.5" : "mt-2 space-y-1.5 pl-3 border-l border-border/60"}>
      {items.map((item, index) => (
        <li key={item.id} data-index={index}>
          <Link
            to={item.href || "#"}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-hidden focus-visible:text-primary"
          >
            {item.label}
          </Link>
          {item.children && item.children.length > 0 && (
            <FooterMenuTree items={item.children} level={level + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

function FooterMenuConsumer() {
  const { isAuthenticated, logout } = useAuth();
  const { menuItems, loading } = useMenu();

  if (loading) {
    return (
      <div className="space-y-2.5">
        <div className="h-4 w-28 bg-muted animate-pulse rounded-md" />
        <div className="h-4 w-36 bg-muted animate-pulse rounded-md" />
        <div className="h-4 w-24 bg-muted animate-pulse rounded-md" />
        <div className="h-4 w-32 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  if (!menuItems || menuItems.length === 0) {
    return (
      <ul className="space-y-2.5">
        <li data-index={0}>
          <Link to="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            Главная
          </Link>
        </li>
        {isAuthenticated &&
        <li data-index={1}>
          <Link to="/NewsPage" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            Новости
          </Link>
        </li>}
        <li data-index={2}>
          <Link to="/AnnouncementsPage" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            Объявления
          </Link>
        </li>
      </ul>
    );
  }

  return <FooterMenuTree items={menuItems} />;
}

export default function Footer() {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] }
    }
  };

  return (
    <footer
      id="подвал"
      data-nav="light"
      className="border-t border-border bg-background text-foreground"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
          className="grid grid-cols-1 gap-10 md:grid-cols-12 lg:gap-12"
        >
          {/* Brand & Studio Intro */}
          <div className="md:col-span-4 lg:col-span-5 flex flex-col items-start gap-4">
            <Link to="/" className="inline-flex items-center transition-opacity hover:opacity-90">
              <WvcLogo className="h-9 w-auto" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Изостудия работает по специальной программе для детей от 5 до 12 лет, совмещая изучение истории искусств и рисования.
              Работает на базе ЧУДО ЦЭВД "Гармония"
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-block size-2 rounded-full bg-chart-1" />
              <span className="inline-block size-2 rounded-full bg-chart-2" />
              <span className="inline-block size-2 rounded-full bg-chart-3" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                Изостудия
              </span>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="md:col-span-3 lg:col-span-3">
            <h3 className="text-base font-semibold text-foreground font-serif tracking-tight mb-4">
              Навигация
            </h3>
            <MenuProvider menu_id="20">
                <FooterMenuConsumer />
            </MenuProvider>
          </div>

          {/* Contacts & Studio Hours */}
          <div className="md:col-span-5 lg:col-span-4">
            <h3 className="text-base font-semibold text-foreground font-serif tracking-tight mb-4">
              Контакты
            </h3>
            <ul className="space-y-3.5 text-sm">
              <li data-index={0} className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                  <MapPin className="size-4" />
                </div>
                <div className="pt-1 text-muted-foreground">
                  г. Балашиха, ул. Шоссе Энтузиастов, д. 54, ЧУДО ЦЭВД "Гармония"
                </div>
              </li>

              <li data-index={1} className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                  <Phone className="size-4" />
                </div>
                <div className="pt-1">
                  <a
                    href="tel:+79160066021"
                    className="font-medium text-foreground transition-colors hover:text-primary"
                  >
                    +7 (916) 006-60-21
                  </a>
                </div>
              </li>

              <li data-index={2} className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                  <Mail className="size-4" />
                </div>
                <div className="pt-1">
                  <a
                    href="mailto:info@bviisostudia.ru"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    info@bviisostudia.ru
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Separator and Bottom Bar */}
        <div className="mt-12 pt-6">
          <Separator className="bg-border" />
          <div className="mt-6 flex flex-col items-center justify-between gap-4 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
            <p>
              © {new Date().getFullYear()} Белоцерковская В.И.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}