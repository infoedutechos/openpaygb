// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteHeaderMobileDrawer } from "@/components/pay/SiteHeaderMobileDrawer";
import { SiteHeaderNavDropdown } from "@/components/pay/SiteHeaderNavDropdown";
import { SITE_HEADER_MENUS } from "@/lib/ecosystem/site-nav-menus";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("hover: hover"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("desktop site header dropdown", () => {
  it("opens on hover without being clipped by the header container", async () => {
    const menu = SITE_HEADER_MENUS.find((item) => item.id === "hubs");
    expect(menu).toBeDefined();
    render(<SiteHeaderNavDropdown menu={menu!} />);

    const button = screen.getByRole("button", { name: /hubs/i });
    fireEvent.mouseEnter(button.parentElement!);

    expect(await screen.findByRole("menu")).toHaveClass("fixed");
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: /Dex Hub/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Play Hub/ })).toBeInTheDocument();
  });

  it("still toggles for click and keyboard/touch users", async () => {
    const menu = SITE_HEADER_MENUS.find((item) => item.id === "developers")!;
    render(<SiteHeaderNavDropdown menu={menu} />);

    const button = screen.getByRole("button", { name: /developers/i });
    fireEvent.click(button);
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("mobile site header drawer", () => {
  it("exposes accordion navigation and closes on destination selection", () => {
    const onClose = vi.fn();
    render(
      <SiteHeaderMobileDrawer
        open
        onClose={onClose}
        menus={SITE_HEADER_MENUS}
        studentSignedIn={false}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Menu" })).toBeInTheDocument();
    const hubs = screen.getByRole("button", { name: /hubs/i });
    expect(hubs).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(hubs);
    expect(hubs).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("link", { name: /Play Hub/ }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
