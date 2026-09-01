document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.querySelector(".td-navbar");

  function syncAboutNavbarOffset() {
    if (!navbar) {
      return;
    }

    const navbarHeight = Math.ceil(navbar.getBoundingClientRect().height || navbar.offsetHeight || 0);
    document.body.classList.add("has-ps-about-page");
    document.body.style.setProperty("--ps-about-navbar-offset", `${navbarHeight}px`);
  }

  function measureHiddenContentHeight(block, content) {
    const previous = {
      hidden: content.hidden,
      display: content.style.display,
      position: content.style.position,
      visibility: content.style.visibility,
      pointerEvents: content.style.pointerEvents,
      left: content.style.left,
      top: content.style.top,
      width: content.style.width,
    };

    content.hidden = false;
    content.setAttribute("aria-hidden", "true");
    content.style.display = "block";
    content.style.position = "absolute";
    content.style.visibility = "hidden";
    content.style.pointerEvents = "none";
    content.style.left = "0";
    content.style.top = "0";
    content.style.width = `${block.clientWidth || block.offsetWidth || 0}px`;

    const measuredHeight = Math.ceil(content.offsetHeight || content.scrollHeight || 0);

    content.hidden = previous.hidden;
    content.style.display = previous.display;
    content.style.position = previous.position;
    content.style.visibility = previous.visibility;
    content.style.pointerEvents = previous.pointerEvents;
    content.style.left = previous.left;
    content.style.top = previous.top;
    content.style.width = previous.width;

    return measuredHeight;
  }

  function tokenizePowerShellLine(line) {
    const tokenPattern = /(\$[A-Za-z_][A-Za-z0-9_]*|\bFormat-(?:List|Table)\b|\b\d+(?:[,.]\d+)?%?\b|\.\\[A-Za-z0-9_.-]+|\|)/g;
    const tokens = [];
    let lastIndex = 0;
    let match;

    while ((match = tokenPattern.exec(line)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ text: line.slice(lastIndex, match.index), className: "" });
      }

      const value = match[0];
      let className = "";

      if (value.startsWith("$")) {
        className = "ps-token-variable";
      } else if (value.startsWith("Format-")) {
        className = "ps-token-command";
      } else if (value === "|") {
        className = "ps-token-operator";
      } else if (value.startsWith(".\\")) {
        className = "ps-token-script";
      } else if (/^\d/.test(value)) {
        className = "ps-token-number";
      }

      tokens.push({ text: value, className });
      lastIndex = tokenPattern.lastIndex;
    }

    if (lastIndex < line.length) {
      tokens.push({ text: line.slice(lastIndex), className: "" });
    }

    return tokens;
  }

  function createTokenNode(className) {
    if (!className) {
      return null;
    }

    const node = document.createElement("span");
    node.className = className;
    return node;
  }

  syncAboutNavbarOffset();
  window.addEventListener("resize", syncAboutNavbarOffset, { passive: true });
  window.addEventListener("load", syncAboutNavbarOffset, { passive: true });

  const blocks = document.querySelectorAll(".ps-about");

  if (blocks.length > 0) {
    document.body.classList.add("ps-about-intro-active");
  }

  let pendingBlocks = blocks.length;

  const releaseIntroState = () => {
    pendingBlocks = Math.max(0, pendingBlocks - 1);

    if (pendingBlocks === 0) {
      document.body.classList.remove("ps-about-intro-active");
    }
  };

  blocks.forEach((block) => {
    const terminal = block.querySelector(".ps-terminal-wrapper");
    const command = block.querySelector(".ps-command");
    const output = block.querySelector(".ps-output");
    const cursor = block.querySelector(".ps-cursor");
    const content = block.querySelector(".ps-markdown");
    const scriptName = block.dataset.command || ".\\AboutJustinVerstijnen.ps1";

    if (!terminal || !command || !output || !cursor || !content) {
      return;
    }

    content.hidden = true;
    content.setAttribute("aria-hidden", "true");
    content.classList.add("about-hidden");

    const measuredContentHeight = measureHiddenContentHeight(block, content);
    const terminalHeight = Math.ceil(terminal.offsetHeight || terminal.scrollHeight || 0);
    const reservedHeight = Math.max(terminalHeight, measuredContentHeight);

    if (reservedHeight > 0) {
      block.style.minHeight = `${reservedHeight}px`;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const outputLines = [
      "$hobbies | Format-List",
      "12,7% completed...",
      "$profiles | Format-List",
      "42% completed...",
      "$certifications | Format-Table",
      "67% completed...",
      "Script executed succesfully!"
    ];

    const releaseReservedHeight = () => {
      window.requestAnimationFrame(() => {
        block.style.minHeight = "";
      });
    };

    const showContent = () => {
      content.hidden = false;
      content.removeAttribute("aria-hidden");
      content.classList.remove("about-hidden");
    };

    const appendHighlightedLine = (target, line) => {
      tokenizePowerShellLine(line).forEach((token) => {
        const tokenNode = createTokenNode(token.className);
        const textNode = document.createTextNode(token.text);

        if (tokenNode) {
          tokenNode.appendChild(textNode);
          target.appendChild(tokenNode);
        } else {
          target.appendChild(textNode);
        }
      });
    };

    if (prefersReducedMotion) {
      command.textContent = "";
      appendHighlightedLine(command, scriptName);
      output.appendChild(document.createTextNode("\n"));
      outputLines.forEach((line, index) => {
        appendHighlightedLine(output, line);

        if (index < outputLines.length - 1) {
          output.appendChild(document.createTextNode("\n"));
        }
      });
      cursor.style.display = "none";
      showContent();
      terminal.classList.add("is-hidden");
      setTimeout(() => {
        releaseReservedHeight();
        releaseIntroState();
      }, 50);
      return;
    }

    let commandTokens = tokenizePowerShellLine(scriptName);
    let commandTokenIndex = 0;
    let commandCharIndex = 0;
    let commandTokenNode = null;
    let lineIndex = 0;
    let outputTokens = [];
    let outputTokenIndex = 0;
    let outputCharIndex = 0;
    let outputTokenNode = null;

    function finishSequence() {
      cursor.style.display = "none";
      showContent();

      window.requestAnimationFrame(() => {
        terminal.classList.add("is-hidden");
      });

      setTimeout(() => {
        releaseReservedHeight();
        releaseIntroState();
      }, 450);
    }

    function typeNextTokenCharacter(target, tokens, state) {
      const token = tokens[state.tokenIndex];

      if (!token) {
        return false;
      }

      if (state.charIndex === 0) {
        state.tokenNode = createTokenNode(token.className);

        if (state.tokenNode) {
          target.appendChild(state.tokenNode);
        }
      }

      const character = token.text.charAt(state.charIndex);

      if (state.tokenNode) {
        state.tokenNode.appendChild(document.createTextNode(character));
      } else {
        target.appendChild(document.createTextNode(character));
      }

      state.charIndex += 1;

      if (state.charIndex >= token.text.length) {
        state.tokenIndex += 1;
        state.charIndex = 0;
        state.tokenNode = null;
      }

      return true;
    }

    function typeOutput() {
      if (lineIndex >= outputLines.length) {
        finishSequence();
        return;
      }

      if (outputTokenIndex === 0 && outputCharIndex === 0 && outputTokens.length === 0) {
        output.appendChild(document.createTextNode("\n"));
        outputTokens = tokenizePowerShellLine(outputLines[lineIndex]);
      }

      const outputState = {
        tokenIndex: outputTokenIndex,
        charIndex: outputCharIndex,
        tokenNode: outputTokenNode,
      };

      const typedCharacter = typeNextTokenCharacter(output, outputTokens, outputState);
      outputTokenIndex = outputState.tokenIndex;
      outputCharIndex = outputState.charIndex;
      outputTokenNode = outputState.tokenNode;

      if (typedCharacter) {
        setTimeout(typeOutput, 5);
        return;
      }

      lineIndex += 1;
      outputTokens = [];
      outputTokenIndex = 0;
      outputCharIndex = 0;
      outputTokenNode = null;
      setTimeout(typeOutput, lineIndex === outputLines.length ? 100 : 45);
    }

    function typeCommand() {
      const commandState = {
        tokenIndex: commandTokenIndex,
        charIndex: commandCharIndex,
        tokenNode: commandTokenNode,
      };

      const typedCharacter = typeNextTokenCharacter(command, commandTokens, commandState);
      commandTokenIndex = commandState.tokenIndex;
      commandCharIndex = commandState.charIndex;
      commandTokenNode = commandState.tokenNode;

      if (typedCharacter) {
        setTimeout(typeCommand, 11);
        return;
      }

      setTimeout(typeOutput, 80);
    }

    typeCommand();
  });
});


// Latest GitHub contributions widget on the About page.
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("github-contributions-widget");

  if (!container) {
    return;
  }

  const owner = "JustinVerstijnen";
  const repo = "JVTechnicalBlog";

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(dateString) {
    return new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(dateString));
  }

  function getFirstLine(message) {
    return String(message || "").split("\n")[0];
  }

  fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=5`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }

      return response.json();
    })
    .then((commits) => {
      if (!Array.isArray(commits) || commits.length === 0) {
        container.innerHTML = "<p>No public commits found for this repository.</p>";
        return;
      }

      container.innerHTML = commits.map((commit) => {
        const message = escapeHtml(getFirstLine(commit.commit.message));
        const authorName = escapeHtml(
          commit.commit.author && commit.commit.author.name
            ? commit.commit.author.name
            : "Unknown author"
        );
        const commitDate = commit.commit.author ? formatDate(commit.commit.author.date) : "";
        const commitUrl = escapeHtml(commit.html_url);
        const shortSha = escapeHtml(commit.sha.substring(0, 7));

        return `
          <div class="github-commit">
            <div class="github-commit-title">
              <a href="${commitUrl}" target="_blank" rel="noopener noreferrer">${message}</a>
            </div>
            <div class="github-commit-meta">${authorName} · ${commitDate} · ${shortSha}</div>
          </div>
        `;
      }).join("");
    })
    .catch((error) => {
      container.innerHTML = "<p>Unable to load GitHub contributions.</p>";
      console.error(error);
    });
});
