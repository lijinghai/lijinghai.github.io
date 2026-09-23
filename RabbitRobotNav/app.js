const diagramNodes = [...document.querySelectorAll("[data-mermaid-source]")];

async function renderDiagrams() {
  try {
    const sourceRequests = diagramNodes.map(async (node) => {
      const response = await fetch(node.dataset.mermaidSource);
      if (!response.ok) {
        throw new Error(`Diagram source returned ${response.status}`);
      }
      node.textContent = await response.text();
    });

    const [{ default: mermaid }] = await Promise.all([
      import("https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs"),
      Promise.all(sourceRequests),
    ]);

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      fontFamily: "Inter, Noto Sans SC, Microsoft YaHei, sans-serif",
      themeVariables: {
        background: "#fffdf8",
        primaryColor: "#fff2dc",
        primaryTextColor: "#17211d",
        primaryBorderColor: "#df7b17",
        lineColor: "#6c756f",
        secondaryColor: "#eefaf4",
        tertiaryColor: "#eef6ff",
      },
    });

    await mermaid.run({ nodes: diagramNodes });
    document.documentElement.classList.add("diagrams-ready");
  } catch (_error) {
    diagramNodes.forEach((node) => {
      node.classList.add("diagram-fallback");
      node.textContent = "图表暂时未能在线渲染；请直接查看同目录中的 .mmd 源文件。";
    });
  }
}

renderDiagrams();
