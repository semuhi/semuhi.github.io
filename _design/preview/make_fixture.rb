# Generates static fixtures in website/_design/preview/ simulating the Liquid output
# of the Constellation pages, so the real JS/CSS can be browser-verified without a
# local Jekyll install. Pages: index.html (home), portfolios.html (index),
# portfolio-<key>.html x6, wall.html, teaching.html, about.html.
# encoding: utf-8
require "yaml"
require "json"

# Repo root derived from this script's location (_design/preview/) so the
# workspace folder can move or be renamed without breaking the generator.
ROOT = File.expand_path("../..", __dir__)

# Fixture JS srcs carry the file mtime as a cache-buster: python -m http.server
# sends no Cache-Control, so Chrome heuristically caches edited JS and stale
# scripts survive even hard reloads (bit us 2026-07-20 on network.js).
def vjs(rel)
  "../../#{rel}?v=#{File.mtime("#{ROOT}/#{rel}").to_i}"
end
pubs = YAML.load_file("#{ROOT}/_data/publications.yml")
pf_data = YAML.load_file("#{ROOT}/_data/portfolios.yml")
pfs = pf_data["list"]
type_labels = pf_data["type_labels"]
projects = YAML.load_file("#{ROOT}/_data/projects.yml")
highlights = YAML.load_file("#{ROOT}/_data/highlights.yml")
teaching = YAML.load_file("#{ROOT}/_data/teaching.yml")
social = YAML.load_file("#{ROOT}/_data/social.yml")["posts"] || []
about = YAML.load_file("#{ROOT}/_data/about.yml")
threads = YAML.load_file("#{ROOT}/_data/threads.yml")
wall_cfg = YAML.load_file("#{ROOT}/_data/wall.yml")

MONTHS = %w[JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC]

CDATA = JSON.generate({ "items" => pubs, "portfolios" => pfs, "typeLabels" => type_labels,
                        "tags" => pf_data["tags"], "methods" => pf_data["methods"],
                        "projects" => projects })

# ---------- shared chrome (fixture nav links to fixture files) ----------
# Footer icon row inlined VERBATIM from the real include (single source of truth).
FICONS = File.read("#{ROOT}/_includes/c-footer-icons.html", encoding: "UTF-8")
             .sub(/\{% comment %\}.*?\{% endcomment %\}\n?/m, "")
def chrome(title, body, scripts: "")
  <<~HTML
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self'; base-uri 'self'; form-action 'none'; frame-src 'none'; object-src 'none'">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <title>FIXTURE &middot; #{title}</title>
    <link rel="icon" type="image/png" sizes="32x32" href="../../assets/img/favicon-32.png">
    <link rel="apple-touch-icon" sizes="180x180" href="../../assets/img/favicon-180.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="constellation-flat.css">
    </head>
    <body class="constellation">
    <header class="site">
      <a class="brand" href="index.html">Dr. Semuhi Sinanoglu</a>
      <nav><a href="index.html">Home</a><a href="about.html">About</a><a href="portfolios.html">Portfolios</a><a href="wall.html">Publications</a><a href="teaching.html">Teaching</a></nav>
    </header>
    #{body}
    <footer class="site">
      <span>&copy; 2026 Semuhi Sinanoglu</span>
      <span><a href="https://www.idos-research.de/en/research-staff/sinanoglu-semuhi/" target="_blank" rel="noopener">IDOS</a></span>
      #{FICONS}
    </footer>
    #{scripts}
    </body>
    </html>
  HTML
end

def cdata_script
  %(<script id="c-data" type="application/json">#{CDATA}</script>)
end

# ---------- shared section builders ----------
def pcards(pfs, pubs)
  pfs.map { |pf|
    n = pubs.count { |p| p["portfolio"].include?(pf["key"]) }
    trunk = pf["trunk"]
    <<~HTML
      <a class="pcard#{trunk ? " trunk" : ""}" style="--pc:#{pf["color"]}" href="portfolio-#{pf["key"]}.html">
        #{pf["image"] ? %(<div class="pthumb-box"><img class="pthumb#{pf["fit"] == "contain" ? " contain" : ""}" src="../..#{pf["image"]}" alt="" loading="lazy"></div>) : ""}
        <div class="num">#{pf["num"]}</div>
        <h3>#{pf["title"]}</h3>
        <p>#{pf["blurb"]}</p>
        #{pf["anchor"] ? %(<div class="anchor">#{pf["anchor"]}</div>) : ""}
        <div class="count">#{n} outputs &rarr;</div>
      </a>
    HTML
  }.join
end

def hl_cards(hls)
  hls.map { |h|
    y, m = h["date"].to_s.split("-")
    kind = h["kind"] ? " &middot; #{h["kind"].upcase}" : ""
    title = h["url"] ? %(<a href="#{h["url"]}" target="_blank" rel="noopener">#{h["title"]}</a>) : h["title"]
    tcls = h["fit"] == "contain" ? "thumb contain" : "thumb"
    img = h["image"] ? %(<img class="#{tcls}" src="../..#{h["image"]}" alt="" loading="lazy">) : ""
    # image links like the title (duplicate link: hidden from AT / tab order)
    thumb = h["image"] && h["url"] ? %(<a href="#{h["url"]}" target="_blank" rel="noopener" aria-hidden="true" tabindex="-1">#{img}</a>) : img
    # data-y/data-k/data-pf feed the activity-page chip filters (activity.js);
    # harmless on home. data-pf = space-joined portfolio list (multi allowed).
    %(<article data-y="#{y}" data-k="#{h["kind"]}" data-pf="#{Array(h["portfolio"]).join(" ")}">#{thumb}<div class="d">#{MONTHS[m.to_i - 1]} #{y}#{kind}</div><h3>#{title}</h3></article>)
  }.join
end

# The interactive includes carry no Liquid beyond their {% comment %} header and
# their own <script src> tag, so the fixture inlines the REAL include files
# (single source of truth; the fixture can no longer drift from the site).
def interactive(name)
  html = File.read("#{ROOT}/_includes/#{name}", encoding: "UTF-8")
  html = html.sub(/\{% comment %\}.*?\{% endcomment %\}\n?/m, "")
  html.gsub(/\{\{ '([^']+)' \| relative_url \}\}/) { "../..#{Regexp.last_match(1)}" }
end
FINDING = interactive("c-finding.html")
INTERACTIVE = {
  "propaganda" => FINDING,
  "business"   => interactive("c-conjoint.html"),
  "datahub"    => interactive("c-dertt-teaser.html")
  # aitech's c-depol-arch.html pulled 2026-07-20 (user decision): toolkit in
  # its infancy, don't showcase prematurely. Mirrors c-portfolio-page.html.
}.freeze

# A venue that only repeats the type label ("Working paper") is dropped.
def dedup_venue(pub, type_labels)
  parts = []
  v = pub["venue"].to_s
  parts << v unless v.empty? || v.downcase == type_labels[pub["type"]].to_s.downcase
  parts << "with #{pub["coauthors"]}" if pub["coauthors"]
  parts.join(" &middot; ")
end

def flag_card(pub, pf, type_labels)
  # No dataset diamond before the title (user decision 2026-07-20); the
  # "· dataset" tag in the type line still marks it.
  ds = pub["dataset"] ? " &middot; dataset" : ""
  venueline = dedup_venue(pub, type_labels)
  venue_html = venueline.empty? ? "" : %(<div class="venue">#{venueline}</div>)
  <<~HTML
    <a class="fcard" style="--pc:#{pf["color"]}" href="#{pub["url"] || "#"}"#{pub["url"] ? %( target="_blank" rel="noopener") : ""}>
      <div class="ty">#{type_labels[pub["type"]]}#{ds} &middot; #{pub["year"]}</div>
      <h3>#{pub["title"]}</h3>
      #{venue_html}
      <p>#{pub["blurb"]}</p>
    </a>
  HTML
end

# One row inside a thread block (mirrors c-thread-row.html): badge leads (a
# per-item kicker swallows the numbered venue, like the wall), then title,
# venue, year, + expander. The panel leads with the record — coauthors (full
# names via coauthors_full), presentations, grants, links; entries may be plain
# strings or {label, url} — and the abstract (blurb fallback) comes last.
def linkify(entries)
  Array(entries).map { |e|
    e.is_a?(Hash) ? %(<a href="#{e["url"]}" target="_blank" rel="noopener">#{e["label"]}</a>) : e
  }.join(" &middot; ")
end

def thread_row(p, pf_color, type_labels)
  v = if p["kicker"] || p["venue"].to_s.downcase == type_labels[p["type"]].to_s.downcase
        ""
      else
        p["venue"]
      end
  abs = p["abstract"] || p["blurb"]
  panel = ""
  if abs || p["coauthors"] || p["presentations"] || p["grants"] || p["links"]
    inner = ""
    if p["coauthors"] || p["presentations"] || p["grants"]
      meta = ""
      meta << "<span>With #{p["coauthors_full"] || p["coauthors"]}</span>" if p["coauthors"]
      meta << "<span>Presented: #{linkify(p["presentations"])}</span>" if p["presentations"]
      meta << "<span>Funded by #{linkify(p["grants"])}</span>" if p["grants"]
      inner << %(<p class="xmeta mono">#{meta}</p>)
    end
    if p["links"]
      ls = p["links"].map { |l| %(<a href="#{l["url"]}" target="_blank" rel="noopener">#{l["label"]} &rarr;</a>) }.join
      inner << %(<p class="xlinks mono">#{ls}</p>)
    end
    inner << %(<p class="abs">#{abs}</p>) if abs
    panel = %(<div class="rowx" hidden>#{inner}</div>)
  end
  btn = panel.empty? ? "" : %(<button class="exp" type="button" aria-expanded="false" aria-label="Show details">+</button>)
  <<~HTML
    <div class="row"><span class="badge">#{p["kicker"] || type_labels[p["type"]]}</span>
    <a class="t" href="#{p["url"] || "#"}"#{p["url"] ? %( target="_blank" rel="noopener") : ""}>#{p["title"]}</a><span class="v">#{v}</span><span class="yr">#{p["year"]}</span>#{btn}</div>#{panel}
  HTML
end

# Research lines (mirrors c-portfolio-page.html): curated thread blocks from
# _data/threads.yml first, then any unlisted stream item as a single-row block.
# Returns [html, line_count] so the caller can headline "N research lines".
def thread_blocks(srest, pf_threads, pf_color, type_labels)
  # Member lookup is srest (primary-home only) on every page — datahub's brief
  # full-stream special case was reverted 2026-07-20 (its clusters are
  # primary-only again; cross-listed items surface in Bridges).
  used = []
  blocks = []
  Array(pf_threads).each do |th|
    used.concat(th["ids"])
    mem = th["ids"].map { |tid| srest.find { |p| p["id"] == tid } }.compact
    next if mem.empty?
    desc = th["desc"] ? %(<p class="th-desc">#{th["desc"].strip}</p>) : ""
    head = th["title"] ? %(<div class="th-head"><h3>#{th["title"]}</h3>#{desc}</div>) : ""
    blocks << %(<div class="thread">#{head}#{mem.map { |p| thread_row(p, pf_color, type_labels) }.join}</div>)
  end
  srest.reject { |p| used.include?(p["id"]) }.each do |p|
    blocks << %(<div class="thread">#{thread_row(p, pf_color, type_labels)}</div>)
  end
  [blocks.join, blocks.length]
end

# Caller slices (home passes .first(6), activity passes everything).
PLAT = { "linkedin" => "LinkedIn", "bluesky" => "Bluesky", "x" => "X" }
def fn_cards(posts)
  posts.map { |p|
    d = p["date"]
    plat = PLAT[p["platform"]] || "X"
    tcls = p["fit"] == "contain" ? "thumb contain" : "thumb"
    thumb = p["image"] ? %(<img class="#{tcls}" src="../..#{p["image"]}" alt="" loading="lazy">) : ""
    <<~HTML
      <a class="fncard" data-y="#{d.year}" data-k="#{p["type"]}" data-pf="#{Array(p["portfolio"]).join(" ")}" href="#{p["url"]}" target="_blank" rel="noopener">
        #{thumb}
        <div class="d">#{MONTHS[d.month - 1]} #{d.year} &middot; #{plat.upcase}</div>
        <p>#{p["excerpt"]}</p>
        <span class="mono go">Read on #{plat} &rarr;</span>
      </a>
    HTML
  }.join
end

# ---------- home ----------
# user-curated five newest outputs, reverse-chronological by month (2026-07-19);
# keep in step with the id list in _includes/c-latest.html
recent = [19, 21, 20, 22, 23].map { |i| pubs.find { |p| p["id"] == i } }

# home-only variant: highlight-style cards (round-10 trial 2026-07-19) —
# YYYY/MM · TYPE date line, title, venue + coauthors via dedup_venue
def latest_cards(items, type_labels)
  items.map { |p|
    yr = p["month"] ? "#{p["year"]}/#{format("%02d", p["month"])}" : p["year"].to_s
    tcls = p["fit"] == "contain" ? "thumb contain" : "thumb"
    img = p["image"] ? %(<img class="#{tcls}" src="../..#{p["image"]}" alt="" loading="lazy">) : ""
    thumb = p["image"] ? %(<a href="#{p["url"] || "#"}" target="_blank" rel="noopener" aria-hidden="true" tabindex="-1">#{img}</a>) : ""
    pv = dedup_venue(p, type_labels)
    <<~HTML
      <article>
        #{thumb}
        <div class="d">#{yr} &middot; #{type_labels[p["type"]].upcase}</div>
        <h3><a href="#{p["url"] || "#"}" target="_blank" rel="noopener">#{p["title"]}</a></h3>
        #{pv.empty? ? "" : %(<div class="pv">#{pv}</div>)}
      </article>
    HTML
  }.join
end
home_body = <<~HTML
  <div class="hero">
    <span class="reg" style="top:8px;left:10px">+</span>
    <span class="reg" style="top:8px;right:10px">+</span>
    <span class="reg" style="bottom:8px;left:10px">+</span>
    <span class="reg" style="bottom:8px;right:10px">+</span>
    <div class="hero-head">
      <div class="kicker">Research and policy advice map &middot; #{pubs.length} outputs &middot; 6 portfolios &middot; #{projects.count { |pr| pr["net_x"] }} initiatives</div>
    </div>
    <div class="net-scroll"><svg id="net" class="net" viewBox="0 0 1200 640" role="img" aria-label="Network map of research outputs grouped by six portfolios" data-pf-href="portfolio-{key}.html"></svg></div>
    <div class="chips" id="chips"></div>
    <div class="net-panel" id="panel"></div>
  </div>
  <section id="work">
    <div class="sec-kicker">Outputs</div>
    <h2 class="ruled">Latest Publications</h2>
    <div class="hl">#{latest_cards(recent, type_labels)}</div>
    <p class="mono" style="font-size:12px;margin-top:14px"><a href="wall.html">Browse all #{pubs.length} outputs &rarr;</a></p>
  </section>
  <section>
    <div class="sec-kicker">Milestones</div>
    <h2 class="ruled">Recent Highlights</h2>
    <div class="hl">#{hl_cards(highlights.first(6))}</div>
    <p class="mono" style="font-size:12px;margin-top:14px"><a href="activity.html#highlights">Browse all #{highlights.length} highlights &rarr;</a></p>
  </section>
  #{social.empty? ? "" : <<~SOC
    <section>
      <div class="sec-kicker">Field notes</div>
      <h2 class="ruled">Latest Posts</h2>
      <div class="fn">#{fn_cards(social.first(6))}</div>
      <p class="mono" style="font-size:12px;margin-top:14px"><a href="activity.html#posts">Browse all #{social.length} posts &rarr;</a></p>
    </section>
  SOC
  }
HTML
home_scripts = %(#{cdata_script}\n<script src="#{vjs("assets/js/constellation/network.js")}"></script>)
File.write("#{ROOT}/_design/preview/index.html", chrome("Constellation home preview", home_body, scripts: home_scripts))

# ---------- portfolios index ----------
pidx_body = <<~HTML
  <section class="pf-head" style="--pc:var(--cobalt)">
    <div class="sec-kicker">Mapped</div>
    <h1>Portfolios</h1>
    <p class="narrative">My work can be mapped out in these portfolios. The <a href="wall.html">Work wall</a> holds the full corpus.</p>
  </section>
  <section>
    <div class="cards">#{pcards(pfs, pubs)}</div>
  </section>
HTML
File.write("#{ROOT}/_design/preview/portfolios.html", chrome("Portfolios index", pidx_body))

# ---------- five portfolio pages ----------
pfs.each do |pf|
  key = pf["key"]
  items = pubs.select { |p| p["portfolio"].include?(key) }
  stream = items.sort_by { |p| [-p["year"], -p["id"]] }
  # Stream = primary-home items only. Flagships section dropped 2026-07-19; Data
  # Hub shelves replaced by thread-style research lines 2026-07-20 (its thread
  # member lookup searches the full stream — clusters absorb cross-listed items).
  srest = stream.select { |p| p["portfolio"].first == key }
  # All non-map_only projects render as lead cards (mirrors c-portfolio-page.html,
  # 2026-07-20: aitech gained cityinclusive as a second card; file order = page order).
  pfprojects = projects.select { |pr| pr["portfolio"] == key && !pr["map_only"] }

  lead = ""
  unless pfprojects.empty?
    cards = pfprojects.map do |project|
      go = project["url"] ? %(<a class="mono go" href="#{project["url"]}" target="_blank" rel="noopener">#{project["link_label"] || "Project page"} &rarr;</a>) : ""
      thumb = project["image"] ? %(<img class="lc-thumb" src="../..#{project["image"]}" alt="" loading="lazy">) : ""
      <<~CARD
        <div class="lead-card#{project["image"] ? " has-thumb" : ""}">
          #{thumb}
          <div class="lc-body">
            <div class="kicker">#{project["card_label"] || project["label"]} &middot; #{project["years"]} &middot; #{project["host"]}</div>
            <h2>#{project["title"]}</h2>
            <p>#{project["blurb"]}</p>
            #{go}
          </div>
        </div>
      CARD
    end.join
    lead = <<~HTML
      <section style="--pc:#{pf["color"]}">
        <div class="sec-kicker">Initiative#{pfprojects.length > 1 ? "s" : ""}</div>
        #{cards}
      </section>
    HTML
  end

  finding_html = INTERACTIVE[key] || ""

  threads_html, nlines = thread_blocks(srest, threads[key], pf["color"], type_labels)

  hls = highlights.select { |h| Array(h["portfolio"]).include?(key) }
  hl_html = hls.empty? ? "" : <<~HTML
    <section>
      <div class="sec-kicker">Highlights</div>
      <h2>Recent highlights</h2>
      <div class="hl">#{hl_cards(hls.first(5))}</div>
      <p class="mono" style="font-size:12px;margin-top:14px"><a href="activity.html?pf=#{key}#highlights">Browse all #{hls.length} highlights from this portfolio &rarr;</a></p>
    </section>
  HTML

  # Field notes — newest 5 posts tagged with this portfolio; link preselects the
  # portfolio chip on the activity page via ?pf= (activity.js).
  pposts = social.select { |p| Array(p["portfolio"]).include?(key) }
  posts_html = pposts.empty? ? "" : <<~HTML
    <section>
      <div class="sec-kicker">Field notes</div>
      <h2>Latest posts</h2>
      <div class="fn">#{fn_cards(pposts.first(5))}</div>
      <p class="mono" style="font-size:12px;margin-top:14px"><a href="activity.html?pf=#{key}#posts">Browse all #{pposts.length} posts from this portfolio &rarr;</a></p>
    </section>
  HTML

  # Bridges (reworked 2026-07-19): only items whose PRIMARY home is the other
  # portfolio, cross-listed into this one — the stream already covers primary items.
  bridges = pfs.reject { |o| o["key"] == key }.map { |other|
    shared = items.select { |p| p["portfolio"].first == other["key"] }
    next "" if shared.empty?
    lis = shared.first(4).map { |p| "<li>#{p["title"]}</li>" }.join
    <<~HTML
      <a class="bridge" style="--pc:#{other["color"]}" href="portfolio-#{other["key"]}.html">
        <div class="num">#{other["num"]} &middot; #{shared.length} shared</div>
        <h3>#{other["title"]}</h3>
        <ul>#{lis}</ul>
      </a>
    HTML
  }.join

  body = <<~HTML
    <section class="pf-head" style="--pc:#{pf["color"]}">
      <div class="sec-kicker">Portfolio #{pf["num"]}</div>
      <h1>#{pf["title"]}</h1>
      <p class="narrative">#{pf["narrative"]}</p>
      <div class="pf-meta">#{items.length} outputs &middot; <a href="portfolios.html">all portfolios</a> &middot; <a href="wall.html">the wall</a></div>
    </section>
    #{lead}
    <section>
      <div class="sec-kicker">Research lines</div>
      <h2>#{pf["lines_heading"] || "All #{srest.length} outputs, #{nlines} research lines"}</h2>
      <div class="latest xstream threads" style="--pc:#{pf["color"]}">#{threads_html}</div>
    </section>
    #{finding_html}
    #{hl_html}
    #{posts_html}
    <section>
      <div class="sec-kicker">Bridges</div>
      <h2>From the other portfolios</h2>
      <div class="bridges">#{bridges}</div>
    </section>
  HTML
  File.write("#{ROOT}/_design/preview/portfolio-#{key}.html",
             chrome("Portfolio #{pf["num"]} #{pf["title"]}", body,
                    scripts: %(<script src="#{vjs("assets/js/constellation/stream.js")}"></script>)))
end

# ---------- wall ----------
# Selected work (2026-07-20): curated flag cards above the filter chips —
# ordered ids from _data/wall.yml (mirrors c-wall.html).
featured_cards = (wall_cfg["featured"] || []).map { |fid|
  pub = pubs.find { |p| p["id"] == fid }
  pub ? flag_card(pub, pfs.find { |f| f["key"] == pub["portfolio"].first }, type_labels) : ""
}.join
wall_body = <<~HTML
  <section class="pf-head" style="--pc:var(--cobalt)">
    <div class="sec-kicker">The Work wall</div>
    <h1>Publications</h1>
    <p class="narrative">The full corpus in one place: peer-reviewed articles, working and discussion papers, datasets, policy briefs, and op-eds.</p>
  </section>
  <section>
    <div class="sec-kicker">Selected work</div>
    <div class="fgrid">#{featured_cards}</div>
  </section>
  <section>
    <div class="sec-kicker">Browse &amp; filter</div>
    <h2>The full ledger</h2>
    <div class="wall-filters" id="wall-filters"></div>
    <div class="wall-count mono" id="wall-count"></div>
    <div class="latest wall-rows" id="wall-rows"></div>
  </section>
HTML
File.write("#{ROOT}/_design/preview/wall.html",
           chrome("Work wall", wall_body, scripts: %(#{cdata_script}\n<script src="#{vjs("assets/js/constellation/wall.js")}"></script>)))

# ---------- teaching ----------
courses = teaching["courses"].map { |c|
  evals = ""
  if c["evaluations"]
    quotes = c["evaluations"].map { |q| "<blockquote>#{q}</blockquote>" }.join
    evals = %(<details class="evals"><summary>Student evaluations</summary>#{quotes}</details>)
  end
  thumb = c["image"] ? %(<img class="ithumb" src="../..#{c["image"]}" alt="" loading="lazy">) : ""
  <<~HTML
    <div class="fcard course" style="--pc:var(--cobalt)">
      #{thumb}
      <div class="ty">#{c["role"]}#{c["institution"] ? " &middot; #{c["institution"]}" : ""}</div>
      <h3>#{c["title"]}</h3>
      <p>#{c["description"]}</p>
      <a class="mono go" href="../..#{c["syllabus"]}" target="_blank" rel="noopener">#{c["link_label"] || "Syllabus (PDF)"} &rarr;</a>
      #{evals}
    </div>
  HTML
}.join
# month stays in the yml `date` for chronological ordering; display is year-only
workshops = teaching["workshops"].map { |w|
  <<~HTML
    <div class="row"><span class="yr">#{w["date"].split.last}</span>
    <a class="t" href="#{w["url"]}" target="_blank" rel="noopener">#{w["title"]}</a><span class="v">#{w["venue"]}</span></div>
  HTML
}.join
trainings = teaching["training"].map { |w|
  note = w["note"] ? " &middot; #{w["note"]}" : ""
  <<~HTML
    <div class="row"><span class="yr">#{w["date"].split.last}</span>
    <span class="t">#{w["title"]}#{note}</span><span class="v">#{w["venue"]}</span></div>
  HTML
}.join
ta = teaching["assistantship"]["groups"].map { |g|
  lis = g["courses"].map { |c| "<li>#{c}</li>" }.join
  %(<div class="ta-group"><div class="flabel">#{g["field"]}</div><ul>#{lis}</ul></div>)
}.join
teach_body = <<~HTML
  <section class="pf-head" style="--pc:var(--cobalt)">
    <div class="sec-kicker">Teaching</div>
    <h1>Teaching and training</h1>
    <p class="narrative">I designed and taught three courses as instructor at the University of Toronto for ten semesters, and designed a fourth on quantitative methods in conflict studies. I run methods workshops and guest lectures, and practitioner trainings.</p>
  </section>
  <section>
    <div class="sec-kicker">Instruction &amp; design</div>
    <h2>Courses taught and designed</h2>
    <div class="fgrid">#{courses}</div>
  </section>
  <section>
    <div class="sec-kicker">Workshops & guest lectures</div>
    <h2>Methods and topics</h2>
    <div class="latest compact">#{workshops}</div>
  </section>
  <section>
    <div class="sec-kicker">Beyond the classroom</div>
    <h2>Practitioner trainings</h2>
    <div class="latest compact">#{trainings}</div>
  </section>
  <section>
    <div class="sec-kicker">#{teaching["assistantship"]["institution"]}</div>
    <h2>Teaching assistantship</h2>
    <div class="ta-groups">#{ta}</div>
  </section>
HTML
File.write("#{ROOT}/_design/preview/teaching.html", chrome("Teaching", teach_body))

# ---------- activity (full highlights + posts archive; no nav entry) ----------
activity_body = <<~HTML
  <section class="pf-head" style="--pc:var(--cobalt)">
    <div class="sec-kicker">Activity</div>
    <h1>Highlights and posts</h1>
  </section>
  <section id="highlights">
    <div class="sec-kicker">Milestones</div>
    <h2>All Highlights</h2>
    <div class="wall-filters" id="hl-filters"></div>
    <div class="wall-count mono" id="hl-count"></div>
    <div class="hl">#{hl_cards(highlights)}</div>
  </section>
  <section id="posts">
    <div class="sec-kicker">Field notes</div>
    <h2>All Posts</h2>
    <div class="wall-filters" id="po-filters"></div>
    <div class="wall-count mono" id="po-count"></div>
    <div class="fn">#{fn_cards(social)}</div>
  </section>
HTML
# chip metadata + filter script, matching activity.md / c-activity.html
act_pf = JSON.generate(pfs.map { |p| { "key" => p["key"], "short" => p["short"], "color" => p["color"] } })
activity_scripts = %(<script id="act-pf" type="application/json">#{act_pf}</script>\n<script src="#{vjs("assets/js/constellation/activity.js")}"></script>)
File.write("#{ROOT}/_design/preview/activity.html", chrome("Activity archive", activity_body, scripts: activity_scripts))

# ---------- about ----------
bio = about["bio"].map { |p|
  %(<p class="narrative">#{p.gsub('<a href=', '<a target="_blank" rel="noopener" href=')}</p>)
}.join
launched_cards = about["launched"].map { |n|
  desc = n["desc"].gsub('<a href=', '<a target="_blank" rel="noopener" href=')
  fit = n["fit"] == "contain" ? " ithumb--contain" : ""
  # site-internal portfolio links (e.g. the Autocracy Data Hub card) 404 on the
  # bare preview server; point them at the sibling fixture instead
  url = n["url"].sub(%r{\A/portfolios/(\w+)/\z}, 'portfolio-\1.html')
  <<~HTML
    <div class="fcard" style="--pc:#{n["color"]}">
      <a href="#{url}" target="_blank" rel="noopener" aria-hidden="true" tabindex="-1"><img class="ithumb#{fit}" src="../..#{n["img"]}" alt="#{n["title"]}"></a>
      <div class="ty">#{n["label"]}</div>
      <h3><a href="#{url}" target="_blank" rel="noopener">#{n["title"]}</a></h3>
      <p>#{desc}</p>
    </div>
  HTML
}.join
rec_groups = about["recognition"].map { |g|
  lis = g["entries"].map { |e|
    body = e["url"] ? %(<a href="#{e["url"]}" target="_blank" rel="noopener">#{e["what"]}</a>) : e["what"]
    %(<li><span class="when">#{e["when"]}</span> #{body} &middot; #{e["role"]}</li>)
  }.join
  %(<div class="ta-group"><div class="flabel">#{g["group"]}</div><ul>#{lis}</ul></div>)
}.join
edu_groups = about["education"].map { |g|
  lis = g["entries"].map { |e|
    org = e["org_url"] ? %(<a href="#{e["org_url"]}" target="_blank" rel="noopener">#{e["org"]}</a>) : e["org"]
    deg = e["url"] ? %(<a href="#{e["url"]}" target="_blank" rel="noopener">#{e["degree"]}</a>) : e["degree"]
    %(<li><span class="when">#{e["when"]}</span> <strong>#{org}</strong> &middot; #{deg}</li>)
  }.join
  %(<div class="ta-group"><div class="flabel">#{g["group"]}</div><ul>#{lis}</ul></div>)
}.join
plinks = about["profiles"].map { |pr|
  icon = File.read("#{ROOT}/_includes/icons/#{pr["icon"]}.svg").strip
  blank = pr["url"].start_with?("mailto:") ? "" : %( target="_blank" rel="noopener")
  %(<a class="plink" href="#{pr["url"]}" title="#{pr["label"]}" aria-label="#{pr["label"]}"#{blank}>#{icon}</a>)
}.join
about_body = <<~HTML
  <section class="pf-head about-head" style="--pc:var(--cobalt)">
    <div class="sec-kicker">#{about["kicker"]}</div>
    <h1>#{about["heading"]}</h1>
    <div class="about-cols">
      <div id="bio">
        #{bio}
      </div>
      <img class="portrait" src="../../assets/img/prof_pic.jpg" alt="Portrait of Semuhi Sinanoglu">
    </div>
  </section>
  <section>
    <div class="sec-kicker">Launched</div>
    <h2>Initiatives</h2>
    <div class="fgrid">#{launched_cards}</div>
  </section>
  <section id="recognition">
    <div class="sec-kicker">Recognition</div>
    <h2>Fellowships &amp; Awards</h2>
    <div class="ta-groups two">#{rec_groups}</div>
  </section>
  <section id="education">
    <div class="sec-kicker">Background</div>
    <h2>Education</h2>
    <div class="ta-groups two">#{edu_groups}</div>
  </section>
  <section id="cv">
    <div class="sec-kicker">Network</div>
    <h2>My Profiles</h2>
    <div class="about-links">#{plinks}</div>
  </section>
HTML
File.write("#{ROOT}/_design/preview/about.html",
           chrome("About / CV", about_body,
                  scripts: %(<script src="#{vjs("assets/js/constellation/about.js")}"></script>)))

puts "wrote fixtures: index, portfolios, #{pfs.map { |p| "portfolio-#{p["key"]}" }.join(", ")}, wall, teaching, activity, about (#{pubs.length} items)"
