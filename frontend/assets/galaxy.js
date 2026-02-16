/**
 * Galaxy visualization - D3 force-directed graph of the Sudoku puzzle universe.
 *
 * Fetches data from the Galaxy API, renders an interactive SVG with zoom/pan,
 * cluster hulls, tooltips, sidebar filters, and live WebSocket updates.
 */

(() => {
  // -- Technique family configuration --

  const TECHNIQUE_FAMILIES = {
    singles: {
      label: 'Singles',
      color: '#22c55e',
      techniques: {
        HiddenSingle: '#86efac',
        NakedSingle: '#22c55e',
      },
    },
    pairs_triples: {
      label: 'Pairs & Triples',
      color: '#10b981',
      techniques: {
        NakedPair: '#a7f3d0',
        HiddenPair: '#6ee7b7',
        NakedTriple: '#34d399',
        HiddenTriple: '#10b981',
        NakedQuad: '#059669',
        HiddenQuad: '#047857',
      },
    },
    intersections: {
      label: 'Intersections',
      color: '#f59e0b',
      techniques: {
        PointingPair: '#fde68a',
        BoxLineReduction: '#f59e0b',
      },
    },
    fish: {
      label: 'Fish',
      color: '#0284c7',
      techniques: {
        XWing: '#bae6fd',
        Swordfish: '#7dd3fc',
        Jellyfish: '#38bdf8',
        FinnedXWing: '#0ea5e9',
        FinnedSwordfish: '#0284c7',
        FinnedJellyfish: '#0369a1',
        SiameseFish: '#075985',
        FrankenFish: '#0c4a6e',
        MutantFish: '#164e63',
        KrakenFish: '#155e75',
      },
    },
    wings: {
      label: 'Wings',
      color: '#a855f7',
      techniques: {
        XYWing: '#e9d5ff',
        XYZWing: '#d8b4fe',
        WXYZWing: '#c084fc',
        WWing: '#7c3aed',
      },
    },
    chains: {
      label: 'Chains',
      color: '#4f46e5',
      techniques: {
        XChain: '#c7d2fe',
        ThreeDMedusa: '#818cf8',
        AIC: '#4f46e5',
      },
    },
    rectangles: {
      label: 'Rectangles',
      color: '#f97316',
      techniques: {
        EmptyRectangle: '#fed7aa',
        UniqueRectangleType1: '#fdba74',
        UniqueRectangleType2: '#fb923c',
        UniqueRectangleType3: '#f97316',
        UniqueRectangleType4: '#ea580c',
        HiddenRectangle: '#c2410c',
        UniqueRectangleType5: '#9a3412',
        UniqueRectangleType6: '#7c2d12',
        ExtendedUniqueRectangle: '#ea580c',
      },
    },
    als: {
      label: 'ALS',
      color: '#db2777',
      techniques: {
        AlsXz: '#f9a8d4',
        AlsXyWing: '#f472b6',
        AlsChain: '#db2777',
      },
    },
    forcing: {
      label: 'Forcing',
      color: '#e11d48',
      techniques: {
        NishioForcingChain: '#fda4af',
        BowmanBingo: '#fb7185',
        ForcingChain: '#f43f5e',
        DynamicForcingChain: '#e11d48',
      },
    },
    other: {
      label: 'Other',
      color: '#64748b',
      techniques: {
        SueDeCoq: '#cbd5e1',
        AlignedPairExclusion: '#94a3b8',
        DeathBlossom: '#64748b',
        BUG: '#475569',
        Backtracking: '#1e293b',
      },
    },
  };

  // Secret families — hidden unless ukodus_secrets is unlocked
  const SECRETS_UNLOCKED = localStorage.getItem('ukodus_secrets') === '1';
  const SECRET_FAMILIES = new Set(['chains', 'als', 'forcing', 'other']);

  // Difficulty tier colors
  const DIFFICULTY_COLORS = {
    Beginner: '#86efac',
    Easy: '#22c55e',
    Medium: '#f59e0b',
    Intermediate: '#fb923c',
    Hard: '#ef4444',
    Expert: '#dc2626',
    Master: '#9333ea',
    Extreme: '#1e293b',
  };

  // Build a flat lookup: technique name -> color
  const TECHNIQUE_COLOR_MAP = {};
  const VISIBLE_TECHNIQUES = new Set();
  for (const [familyKey, family] of Object.entries(TECHNIQUE_FAMILIES)) {
    for (const [name, color] of Object.entries(family.techniques)) {
      TECHNIQUE_COLOR_MAP[name] = color;
      if (SECRETS_UNLOCKED || !SECRET_FAMILIES.has(familyKey)) {
        VISIBLE_TECHNIQUES.add(name);
      }
    }
  }

  // Resolve a node's primary color based on difficulty
  function nodeColor(d) {
    return DIFFICULTY_COLORS[d.difficulty] || '#64748b';
  }

  // Resolve a node's radius based on play_count
  function nodeRadius(d) {
    const r = Math.sqrt(d.play_count || 1) * 3;
    return Math.max(4, Math.min(20, r));
  }

  // Escape text for safe DOM insertion
  function escapeText(str) {
    if (typeof str !== 'string') return String(str ?? '');
    return str.replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  // -- DOM refs --

  const svg = d3.select('#galaxy-svg');
  const tooltip = document.getElementById('galaxy-tooltip');
  const detailPanel = document.getElementById('detail-panel');
  const filterGroup = document.getElementById('filter-group');
  const loadingEl = document.getElementById('galaxy-loading');

  // -- State --

  let nodes = [];
  let edges = [];
  let simulation = null;
  let activeFilters = new Set(
    Object.keys(TECHNIQUE_FAMILIES).filter(k => SECRETS_UNLOCKED || !SECRET_FAMILIES.has(k))
  );
  let selectedNode = null;
  let ws = null;

  // -- API --

  const API_BASE = '';

  async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        if (i < retries - 1) {
          await new Promise(r => setTimeout(r, 500 * (i + 1)));
        } else {
          console.warn(`Failed to fetch ${url} after ${retries} attempts:`, e);
          return null;
        }
      }
    }
  }

  function fetchOverview() {
    return fetchWithRetry(`${API_BASE}/api/v1/galaxy/overview`);
  }

  function fetchStats() {
    return fetchWithRetry(`${API_BASE}/api/v1/galaxy/stats`);
  }

  // -- Filters --

  function buildFilters() {
    // Clear existing filters using safe DOM methods
    while (filterGroup.firstChild) filterGroup.removeChild(filterGroup.firstChild);

    for (const [familyKey, family] of Object.entries(TECHNIQUE_FAMILIES)) {
      if (!SECRETS_UNLOCKED && SECRET_FAMILIES.has(familyKey)) continue;

      const item = document.createElement('label');
      item.className = 'filter-item';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = activeFilters.has(familyKey);
      cb.addEventListener('change', () => {
        if (cb.checked) {
          activeFilters.add(familyKey);
        } else {
          activeFilters.delete(familyKey);
        }
        applyFilters();
      });

      const swatch = document.createElement('span');
      swatch.className = 'filter-swatch';
      swatch.style.backgroundColor = family.color;

      const label = document.createElement('span');
      label.className = 'filter-label';
      label.textContent = family.label;

      const count = document.createElement('span');
      count.className = 'filter-count';
      count.dataset.family = familyKey;
      count.textContent = '0';

      item.appendChild(cb);
      item.appendChild(swatch);
      item.appendChild(label);
      item.appendChild(count);
      filterGroup.appendChild(item);
    }
  }

  function updateFilterCounts() {
    const counts = {};
    for (const familyKey of Object.keys(TECHNIQUE_FAMILIES)) counts[familyKey] = 0;

    for (const node of nodes) {
      const family = nodePrimaryFamily(node);
      if (family && counts[family] !== undefined) counts[family]++;
    }

    for (const [familyKey, c] of Object.entries(counts)) {
      const el = filterGroup.querySelector(`[data-family="${familyKey}"]`);
      if (el) el.textContent = String(c);
    }
  }

  function nodePrimaryFamily(d) {
    if (!d.techniques || d.techniques.length === 0) return 'singles';
    // Use the hardest technique as primary family
    const hardest = d.techniques[d.techniques.length - 1];
    for (const [familyKey, family] of Object.entries(TECHNIQUE_FAMILIES)) {
      if (hardest in family.techniques) return familyKey;
    }
    return 'other';
  }

  function isNodeVisible(d) {
    return activeFilters.has(nodePrimaryFamily(d));
  }

  function applyFilters() {
    svg.selectAll('.galaxy-node')
      .classed('dimmed', d => !isNodeVisible(d));

    svg.selectAll('.galaxy-edge')
      .attr('stroke-opacity', d => {
        const srcVis = isNodeVisible(d.source);
        const tgtVis = isNodeVisible(d.target);
        if (!srcVis || !tgtVis) return 0.02;
        return d.similarity || 0.1;
      });

    svg.selectAll('.cluster-hull')
      .attr('display', d => activeFilters.has(d.family) ? null : 'none');
  }

  // -- Stats --

  function updateStats(stats) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = typeof val === 'number' ? val.toLocaleString() : String(val);
    };
    if (stats) {
      set('stat-puzzles', stats.total_puzzles || 0);
      set('stat-plays', stats.total_plays || 0);
    }
    // Compute technique coverage from actual node data
    const observed = new Set();
    for (const node of nodes) {
      if (node.techniques) {
        for (const t of node.techniques) {
          if (VISIBLE_TECHNIQUES.has(t)) observed.add(t);
        }
      }
    }
    const total = VISIBLE_TECHNIQUES.size;
    set('stat-techniques', observed.size + ' / ' + total);
    const pct = total > 0 ? Math.round((observed.size / total) * 100) : 0;
    set('stat-explored', pct + '%');
  }

  // -- Detail panel (safe DOM construction) --

  function showDetail(d) {
    selectedNode = d;

    // Clear panel safely
    while (detailPanel.firstChild) detailPanel.removeChild(detailPanel.firstChild);
    detailPanel.className = 'detail-panel';

    // Hash
    const hashDiv = document.createElement('div');
    hashDiv.className = 'detail-hash';
    hashDiv.textContent = d.short_code || d.puzzle_hash || '---';
    detailPanel.appendChild(hashDiv);

    // Meta info
    const metaDiv = document.createElement('div');
    metaDiv.className = 'detail-meta';

    const metaItems = [
      ['Difficulty', d.difficulty || '?'],
      ['SE Rating', d.se_rating != null ? d.se_rating.toFixed(1) : '?'],
      ['Plays', String(d.play_count || 0)],
      ['Avg Time', d.avg_time_secs ? formatTime(d.avg_time_secs) : '--'],
    ];

    for (const [label, val] of metaItems) {
      const row = document.createElement('span');
      row.textContent = label + ' ';
      const valSpan = document.createElement('span');
      valSpan.className = 'val';
      valSpan.textContent = val;
      row.appendChild(valSpan);
      metaDiv.appendChild(row);
    }
    detailPanel.appendChild(metaDiv);

    // Technique tags
    if (d.techniques && d.techniques.length > 0) {
      const techDiv = document.createElement('div');
      techDiv.className = 'detail-techniques';
      for (const t of d.techniques) {
        const tag = document.createElement('span');
        tag.className = 'technique-tag';
        tag.textContent = t;
        techDiv.appendChild(tag);
      }
      detailPanel.appendChild(techDiv);
    }

    // Play button
    const shortCode = d.short_code || '';
    const playUrl = shortCode
      ? `../play/?s=${encodeURIComponent(shortCode)}&from=galaxy`
      : `../play/?p=${encodeURIComponent(d.puzzle_string || '')}&from=galaxy`;

    const playBtn = document.createElement('a');
    playBtn.className = 'detail-play-btn';
    playBtn.href = playUrl;
    playBtn.textContent = 'Play This Puzzle';
    detailPanel.appendChild(playBtn);

    // Leaderboard section
    const lbSection = document.createElement('div');
    lbSection.className = 'detail-leaderboard';

    const lbHeading = document.createElement('h4');
    lbHeading.textContent = 'Top Times';
    lbSection.appendChild(lbHeading);

    const lbLoading = document.createElement('div');
    lbLoading.className = 'lb-empty';
    lbLoading.textContent = 'Loading\u2026';
    lbSection.appendChild(lbLoading);

    detailPanel.appendChild(lbSection);

    const puzzleHash = d.puzzle_hash;
    fetch(`${API_BASE}/api/v1/results/leaderboard?puzzle_hash=${encodeURIComponent(puzzleHash)}&limit=10`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(entries => {
        if (selectedNode !== d) return;
        lbSection.removeChild(lbLoading);

        if (!entries || entries.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'lb-empty';
          empty.textContent = 'No completions yet';
          lbSection.appendChild(empty);
          return;
        }

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        for (const h of ['#', 'Player', 'Time', 'Hints', 'Errors']) {
          const th = document.createElement('th');
          th.textContent = h;
          headRow.appendChild(th);
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        entries.forEach((entry, i) => {
          const tr = document.createElement('tr');
          const cells = [
            String(i + 1),
            entry.player_tag || (entry.player_id || '').slice(0, 8),
            formatTime(entry.time_secs || 0),
            String(entry.hints_used || 0),
            String(entry.mistakes || 0),
          ];
          for (const val of cells) {
            const td = document.createElement('td');
            td.textContent = val;
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        lbSection.appendChild(table);
      })
      .catch(() => {
        if (selectedNode !== d) return;
        lbLoading.textContent = '\u2014';
      });
  }

  function clearDetail() {
    selectedNode = null;
    while (detailPanel.firstChild) detailPanel.removeChild(detailPanel.firstChild);
    detailPanel.className = 'detail-panel empty';
    detailPanel.textContent = 'Click a node to see details';
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // -- Tooltip (safe DOM construction) --

  function showTooltip(event, d) {
    while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);

    const hashDiv = document.createElement('div');
    hashDiv.className = 'tt-hash';
    hashDiv.textContent = d.short_code || d.puzzle_hash || '---';
    tooltip.appendChild(hashDiv);

    const rows = [
      ['Difficulty', d.difficulty || '?'],
      ['SE Rating', d.se_rating != null ? d.se_rating.toFixed(1) : '?'],
      ['Plays', String(d.play_count || 0)],
    ];

    for (const [label, val] of rows) {
      const row = document.createElement('div');
      row.className = 'tt-row';
      const labelSpan = document.createElement('span');
      labelSpan.textContent = label;
      const valSpan = document.createElement('span');
      valSpan.className = 'tt-val';
      valSpan.textContent = val;
      row.appendChild(labelSpan);
      row.appendChild(valSpan);
      tooltip.appendChild(row);
    }

    tooltip.classList.add('visible');
    positionTooltip(event);
  }

  function positionTooltip(event) {
    const rect = svg.node().getBoundingClientRect();
    const x = event.clientX - rect.left + 12;
    const y = event.clientY - rect.top - 10;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  function hideTooltip() {
    tooltip.classList.remove('visible');
  }

  // -- Convex hull helper --

  function computeHull(points) {
    if (points.length < 3) return null;
    const hull = d3.polygonHull(points);
    if (!hull) return null;
    const centroid = d3.polygonCentroid(hull);
    return hull.map(([x, y]) => {
      const dx = x - centroid[0];
      const dy = y - centroid[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pad = 20;
      return [
        x + (dx / dist) * pad,
        y + (dy / dist) * pad,
      ];
    });
  }

  // -- D3 visualization --

  let g; // main group for zoom
  let hullGroup, edgeGroup, nodeGroup;

  function initSVG() {
    const svgEl = svg.node();
    const { width, height } = svgEl.getBoundingClientRect();

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    g = svg.append('g');
    hullGroup = g.append('g').attr('class', 'hulls');
    edgeGroup = g.append('g').attr('class', 'edges');
    nodeGroup = g.append('g').attr('class', 'nodes');

    return { width, height };
  }

  function buildSimulation(width, height) {
    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(60).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-80))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(d => nodeRadius(d) + 2))
      .alphaDecay(0.02)
      .on('tick', ticked);
  }

  function renderGraph() {
    // Edges
    const edgeSel = edgeGroup.selectAll('line')
      .data(edges, d => `${d.source.id || d.source}-${d.target.id || d.target}`);

    edgeSel.exit().remove();

    edgeSel.enter()
      .append('line')
      .attr('class', 'galaxy-edge')
      .merge(edgeSel)
      .attr('stroke-opacity', d => d.similarity || 0.1);

    // Nodes
    const nodeSel = nodeGroup.selectAll('circle.galaxy-node')
      .data(nodes, d => d.id);

    nodeSel.exit().remove();

    nodeSel.enter()
      .append('circle')
      .attr('class', 'galaxy-node')
      .attr('r', d => nodeRadius(d))
      .attr('fill', d => nodeColor(d))
      .on('mouseover', (event, d) => showTooltip(event, d))
      .on('mousemove', (event) => positionTooltip(event))
      .on('mouseout', () => hideTooltip())
      .on('click', (event, d) => {
        event.stopPropagation();
        showDetail(d);
      })
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded))
      .merge(nodeSel)
      .attr('r', d => nodeRadius(d))
      .attr('fill', d => nodeColor(d));

    // Click on background to deselect
    svg.on('click', () => clearDetail());

    updateHulls();
    applyFilters();
    updateFilterCounts();
  }

  function updateHulls() {
    const familyPoints = {};
    for (const familyKey of Object.keys(TECHNIQUE_FAMILIES)) {
      familyPoints[familyKey] = [];
    }

    for (const node of nodes) {
      const family = nodePrimaryFamily(node);
      if (family && familyPoints[family]) {
        familyPoints[family].push([node.x || 0, node.y || 0]);
      }
    }

    const hullData = [];
    for (const [familyKey, points] of Object.entries(familyPoints)) {
      if (points.length < 3) continue;
      const hull = computeHull(points);
      if (hull) {
        hullData.push({
          family: familyKey,
          path: hull,
          color: TECHNIQUE_FAMILIES[familyKey].color,
        });
      }
    }

    const hullSel = hullGroup.selectAll('path.cluster-hull')
      .data(hullData, d => d.family);

    hullSel.exit().remove();

    hullSel.enter()
      .append('path')
      .attr('class', 'cluster-hull')
      .merge(hullSel)
      .attr('d', d => `M${d.path.join('L')}Z`)
      .attr('fill', d => d.color)
      .attr('stroke', d => d.color)
      .attr('fill-opacity', 0.06)
      .attr('stroke-opacity', 0.15)
      .attr('stroke-width', 1.5);
  }

  function ticked() {
    edgeGroup.selectAll('line')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    nodeGroup.selectAll('circle.galaxy-node')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    // Update hulls occasionally for performance
    if (simulation && simulation.alpha() > 0.1) {
      updateHulls();
    }
  }

  function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  // -- Pulse animation for new nodes --

  function pulseNode(nodeData) {
    const r = nodeRadius(nodeData);
    nodeGroup.append('circle')
      .attr('class', 'pulse-ring')
      .attr('cx', nodeData.x || 0)
      .attr('cy', nodeData.y || 0)
      .attr('r', r)
      .attr('stroke', nodeColor(nodeData))
      .attr('stroke-width', 2)
      .transition()
      .duration(1500)
      .attr('r', r * 3)
      .attr('stroke-opacity', 0)
      .remove();
  }

  // -- WebSocket for live updates --

  function connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}/api/v1/ws/galaxy`;

    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'new_puzzle' && msg.data) {
            addLiveNode(msg.data);
          } else if (msg.type === 'play_result' && msg.data) {
            updateNodePlayCount(msg.data);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket not available
    }
  }

  function addLiveNode(data) {
    const newNode = {
      id: data.puzzle_hash || data.id,
      puzzle_hash: data.puzzle_hash,
      short_code: data.short_code,
      puzzle_string: data.puzzle_string,
      difficulty: data.difficulty,
      se_rating: data.se_rating,
      play_count: data.play_count || 1,
      techniques: data.techniques || [],
      avg_time_secs: data.avg_time_secs,
    };

    const svgRect = svg.node().getBoundingClientRect();
    newNode.x = svgRect.width / 2 + (Math.random() - 0.5) * 100;
    newNode.y = svgRect.height / 2 + (Math.random() - 0.5) * 100;

    nodes.push(newNode);

    if (data.edges) {
      for (const edge of data.edges) {
        edges.push({
          source: edge.source,
          target: edge.target,
          similarity: edge.similarity || 0.1,
        });
      }
    }

    simulation.nodes(nodes);
    simulation.force('link').links(edges);
    simulation.alpha(0.3).restart();

    renderGraph();
    pulseNode(newNode);
    updateFilterCounts();
    updateStats(null);
  }

  function updateNodePlayCount(data) {
    const node = nodes.find(n => n.id === data.puzzle_hash || n.puzzle_hash === data.puzzle_hash);
    if (node) {
      node.play_count = data.play_count || (node.play_count + 1);
      nodeGroup.selectAll('circle.galaxy-node')
        .filter(d => d.id === node.id)
        .transition()
        .duration(300)
        .attr('r', nodeRadius(node));
    }
  }

  // -- Initialize --

  async function init() {
    buildFilters();

    const { width, height } = initSVG();

    const [overview, stats] = await Promise.all([fetchOverview(), fetchStats()]);

    if (loadingEl) loadingEl.style.display = 'none';

    if (overview && overview.nodes && overview.nodes.length > 0) {
      nodes = overview.nodes.map(n => ({
        id: n.puzzle_hash || n.id,
        puzzle_hash: n.puzzle_hash,
        short_code: n.short_code,
        puzzle_string: n.puzzle_string,
        difficulty: n.difficulty,
        se_rating: n.se_rating,
        play_count: n.play_count || 1,
        techniques: n.techniques || [],
        avg_time_secs: n.avg_time_secs,
      }));

      edges = (overview.edges || []).map(e => ({
        source: e.source,
        target: e.target,
        similarity: e.similarity || 0.1,
      }));

      updateStats(stats);
    } else {
      updateStats(stats);
      // Show empty state using safe DOM methods
      const mainEl = document.querySelector('.galaxy-main');
      while (mainEl.firstChild) mainEl.removeChild(mainEl.firstChild);

      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'galaxy-empty';

      const iconDiv = document.createElement('div');
      iconDiv.className = 'empty-icon';
      iconDiv.textContent = '*';
      emptyDiv.appendChild(iconDiv);

      const msg1 = document.createElement('div');
      msg1.textContent = 'No puzzles in the galaxy yet.';
      emptyDiv.appendChild(msg1);

      const msg2 = document.createElement('div');
      msg2.textContent = 'Play a puzzle to add the first star!';
      emptyDiv.appendChild(msg2);

      const playLink = document.createElement('a');
      playLink.className = 'detail-play-btn';
      playLink.href = '../play/';
      playLink.style.marginTop = '12px';
      playLink.textContent = 'Play Now';
      emptyDiv.appendChild(playLink);

      mainEl.appendChild(emptyDiv);
      return;
    }

    buildSimulation(width, height);
    renderGraph();
    connectWebSocket();
  }

  // Handle window resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (simulation) {
        const { width, height } = svg.node().getBoundingClientRect();
        simulation.force('center', d3.forceCenter(width / 2, height / 2));
        simulation.alpha(0.1).restart();
      }
    }, 200);
  });

  init();
})();
