---
permalink: "/research/"
layout: page
title: "Research"
---
# <span style="font-size: 30px; color: #0000EE;">Publications</span>
{%- assign posts = paginator.posts | default: site.posts -%}
{% for post in site.categories.research %}
  <article>
    {% include meta.html post=post preview=false %}
    {{ post.excerpt }}
    <div class="more"><a href="{{ post.url | relative_url }}">read more</a></div>
  </article>
{% endfor %}

{% if paginator.total_pages > 1 %}
  <footer>
    {% if paginator.previous_page %}<a href="{{ paginator.previous_page_path | relative_url }}">« newer posts</a>{% else %}<span></span>{% endif %}
    <span>page {{ paginator.page }} of {{ paginator.total_pages }}</span>
    {% if paginator.next_page %}<a href="{{ paginator.next_page_path | relative_url }}">older posts »</a>{% else %}<span></span>{% endif %}
  </footer>
{% endif %}

# <span style="font-size: 30px; color: #0000EE;">Working Papers</span>

{%- assign posts = paginator.posts | default: site.posts -%}
{% for post in site.categories.research-working %}
  <article>
    {% include meta.html post=post preview=false %}
    {{ post.excerpt }}
    <div class="more"><a href="{{ post.url | relative_url }}">read more</a></div>
  </article>
{% endfor %}

{% if paginator.total_pages > 1 %}
  <footer>
    {% if paginator.previous_page %}<a href="{{ paginator.previous_page_path | relative_url }}">« newer posts</a>{% else %}<span></span>{% endif %}
    <span>page {{ paginator.page }} of {{ paginator.total_pages }}</span>
    {% if paginator.next_page %}<a href="{{ paginator.next_page_path | relative_url }}">older posts »</a>{% else %}<span></span>{% endif %}
  </footer>
{% endif %}

# <span style="font-size: 30px; color: #0000EE;">Ongoing Research</span>

- "The impact of fiction on support for repression." (with Michael Donnelly)
- "The prosecution of Heads of State and democratic backsliding." (with Seva Gunitsky)
-  "The determinants of group defection: Survey experiments with rebel groups in Myanmar." (with POSTCOR Lab)
- "Return to Civil War: Insurgent Groups and the Decision to Abandon Peace." (with POSTCOR Lab)
