import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadPlugin } from "@/test/load-plugin";

describe("heading-anchor plugin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    document.head.innerHTML = "";
    document.body.innerHTML = "";
    window.history.replaceState(null, "", "/post");

    document.documentElement.style.setProperty("--header-height", "84px");
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 0,
    });

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  it("adds anchor links and generates unique ids for headings", async () => {
    document.body.innerHTML = `
      <div id="article">
        <h2>First Section</h2>
        <h3>Second Section</h3>
        <h2>First Section</h2>
      </div>
    `;

    await loadPlugin(() => import("@/plugins/heading-anchor"));

    const [first, third] = screen
      .getAllByText("First Section")
      .map((node) => node.closest("h2"));
    const second = screen.getByText("Second Section").closest("h3");

    expect(first).toHaveAttribute("id", "first-section");
    expect(second).toHaveAttribute("id", "second-section");
    expect(third).toHaveAttribute("id", "first-section-2");

    const anchors = document.querySelectorAll(".rp-heading-anchor");
    expect(anchors).toHaveLength(3);
    expect(anchors[0]).toHaveAttribute("href", "#first-section");
    expect(anchors[1]).toHaveAttribute("href", "#second-section");
  });

  it("keeps an existing id and appends an anchor link once", async () => {
    document.body.innerHTML = `
      <div id="article">
        <h2 id="custom-id">Custom Title</h2>
      </div>
    `;

    await loadPlugin(() => import("@/plugins/heading-anchor"));
    await loadPlugin(() => import("@/plugins/heading-anchor"));

    const heading = screen.getByText("Custom Title").closest("h2");
    const anchors = heading?.querySelectorAll(".rp-heading-anchor");

    expect(heading).toHaveAttribute("id", "custom-id");
    expect(anchors).toHaveLength(1);
    expect(anchors?.[0]).toHaveAttribute("href", "#custom-id");
  });

  it("copies the section url and scrolls when the anchor is clicked", async () => {
    document.body.innerHTML = `
      <div id="article">
        <h2>Anchor Target</h2>
      </div>
    `;

    await loadPlugin(() => import("@/plugins/heading-anchor"));

    const heading = screen.getByText("Anchor Target").closest("h2");
    const anchor = heading?.querySelector(".rp-heading-anchor");

    expect(heading).toBeTruthy();
    expect(anchor).toBeTruthy();

    vi.spyOn(heading as HTMLElement, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 250,
      right: 0,
      bottom: 250,
      left: 0,
      toJSON: () => ({}),
    });

    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 300,
    });

    fireEvent.click(anchor as Element);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "http://localhost:3000/post#anchor-target",
      );
      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 466,
        behavior: "smooth",
      });
    });
  });

  it("copies the section url when the heading itself is clicked", async () => {
    document.body.innerHTML = `
      <div id="article">
        <h2>Heading Click</h2>
      </div>
    `;

    await loadPlugin(() => import("@/plugins/heading-anchor"));

    const heading = screen.getByText("Heading Click").closest("h2");

    vi.spyOn(heading as HTMLElement, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 120,
      right: 0,
      bottom: 120,
      left: 0,
      toJSON: () => ({}),
    });

    fireEvent.click(heading as HTMLElement);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "http://localhost:3000/post#heading-click",
      );
    });
  });

  it("does not activate when text inside a heading is selected", async () => {
    document.body.innerHTML = `
      <div id="article">
        <h2>Selected Heading</h2>
      </div>
    `;

    await loadPlugin(() => import("@/plugins/heading-anchor"));

    const heading = screen.getByText("Selected Heading").closest("h2");
    const getSelectionSpy = vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "Selected Heading",
    } as Selection);

    fireEvent.click(heading as HTMLElement);

    await Promise.resolve();

    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("");

    getSelectionSpy.mockRestore();
  });

  it("repositions the initial hash target after images before it finish loading", async () => {
    window.history.replaceState(null, "", "/post#target-heading");

    document.body.innerHTML = `
      <div id="article"> 
        <img alt="cover" src="">
        <h2 id="target-heading">Target Heading</h2>
      </div>
    `;

    const image = document.querySelector("img") as HTMLImageElement;
    const heading = screen
      .getByText("Target Heading")
      .closest("h2") as HTMLElement;

    Object.defineProperty(image, "complete", {
      configurable: true,
      get: () => false,
    });

    vi.spyOn(heading, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 180,
      right: 0,
      bottom: 180,
      left: 0,
      toJSON: () => ({}),
    });

    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      });

    await loadPlugin(() => import("@/plugins/heading-anchor"));

    expect(window.scrollTo).not.toHaveBeenCalled();

    fireEvent.load(image);

    await waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 96,
        behavior: "auto",
      });
    });

    rafSpy.mockRestore();
  });
});
