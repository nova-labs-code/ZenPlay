(async function () {
    // -----------------------------
    // DON'T SHOW IN IFRAME IF
    // MAIN SITE ALREADY HAS WATERMARK
    // -----------------------------

    if (window.top !== window.self) {
        try {
            if (window.top.document.getElementById("nlc-watermark")) {
                return;
            }
        } catch (error) {
            // Cross-origin iframe.
            // Parent cannot be inspected.
        }
    }

    // -----------------------------
    // LOAD SITES.JSON
    // -----------------------------

    let hiddenSites = [];

    try {
        const response = await fetch(
            chrome.runtime.getURL("sites.json")
        );

        const config = await response.json();
        hiddenSites = config.hiddenSites || [];
    } catch (error) {
        console.error("Could not load sites.json:", error);
    }

    // -----------------------------
    // CHECK SITE + PAGE
    // -----------------------------

    const currentHost = window.location.hostname.toLowerCase();
    const currentPath =
        window.location.pathname.toLowerCase().replace(/\/+$/, "") || "/";

    const shouldHide = hiddenSites.some(entry => {
        entry = entry
            .toLowerCase()
            .trim()
            .replace(/^https?:\/\//, "")
            .replace(/^www\./, "")
            .replace(/\/+$/, "");

        if (!entry) return false;

        const slashIndex = entry.indexOf("/");

        // -----------------------------
        // DOMAIN ONLY
        // -----------------------------

        if (slashIndex === -1) {
            return (
                currentHost === entry ||
                currentHost.endsWith("." + entry)
            );
        }

        // -----------------------------
        // DOMAIN + SPECIFIC PAGE
        // -----------------------------

        const entryHost = entry.substring(0, slashIndex);
        const entryPath =
            "/" + entry.substring(slashIndex + 1);

        const hostMatches =
            currentHost === entryHost ||
            currentHost.endsWith("." + entryHost);

        if (!hostMatches) return false;

        // Exact page or anything underneath it
        return (
            currentPath === entryPath ||
            currentPath.startsWith(entryPath + "/")
        );
    });

    if (shouldHide) {
        return;
    }

    // -----------------------------
    // ADD WATERMARK
    // -----------------------------

    function addWatermark() {
        if (document.getElementById("nlc-watermark")) return;

        const watermark = document.createElement("div");
        const text = document.createElement("span");

        watermark.id = "nlc-watermark";
        text.textContent = "Made by NLC";

        // -----------------------------
        // WATERMARK BLOCK
        // -----------------------------

        Object.assign(watermark.style, {
            position: "fixed",
            bottom: "12px",
            right: "12px",

            padding: "8px 14px",
            borderRadius: "10px",

            background: "rgba(55, 65, 81, 0.45)",

            border: "3px solid rgba(255, 255, 255, 0.5)",

            boxShadow:
                "0 4px 14px rgba(0, 0, 0, 0.25)",

            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",

            zIndex: "999999",
            pointerEvents: "none",
            userSelect: "none"
        });

        // -----------------------------
        // TEXT
        // -----------------------------

        Object.assign(text.style, {
            color: "#fff",

            fontFamily:
                "Arial, Helvetica, sans-serif",

            fontSize: "13px",
            fontWeight: "600",
            letterSpacing: "0.3px",

            transition: "color 0.2s ease"
        });

        watermark.appendChild(text);
        document.body.appendChild(watermark);

        // -----------------------------
        // DETECT BACKGROUND
        // -----------------------------

        function updateTextColor() {
            const rect = watermark.getBoundingClientRect();

            watermark.style.visibility = "hidden";

            const points = [
                [rect.left + rect.width / 2, rect.top + rect.height / 2],
                [rect.left + 5, rect.top + 5],
                [rect.right - 5, rect.top + 5],
                [rect.left + 5, rect.bottom - 5],
                [rect.right - 5, rect.bottom - 5]
            ];

            let brightness = [];

            for (const [x, y] of points) {
                const element = document.elementFromPoint(x, y);

                if (!element) continue;

                let current = element;
                let color = null;

                while (current) {
                    const bg =
                        getComputedStyle(current).backgroundColor;

                    const match = bg.match(
                        /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/
                    );

                    if (match) {
                        color = [
                            Number(match[1]),
                            Number(match[2]),
                            Number(match[3])
                        ];
                        break;
                    }

                    current = current.parentElement;
                }

                if (color) {
                    const r = color[0];
                    const g = color[1];
                    const b = color[2];

                    const value =
                        (r * 299 +
                         g * 587 +
                         b * 114) / 1000;

                    brightness.push(value);
                }
            }

            watermark.style.visibility = "visible";

            if (!brightness.length) return;

            const average =
                brightness.reduce((a, b) => a + b, 0) /
                brightness.length;

            text.style.color =
                average >= 150 ? "#000" : "#fff";
        }

        updateTextColor();

        window.addEventListener(
            "scroll",
            updateTextColor,
            { passive: true }
        );

        window.addEventListener(
            "resize",
            updateTextColor
        );

        setInterval(updateTextColor, 250);
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            addWatermark
        );
    } else {
        addWatermark();
    }
})();
