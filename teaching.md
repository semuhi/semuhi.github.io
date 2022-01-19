---
layout: default
permalink: "/teaching/"
title: "Teaching"
---

{% if site.show_excerpts %} {% include home.html %} {% else %}

{% for post in site.categories.course %}
 <li><span>{{ post.date | date_to_string }}</span> &nbsp; <a href="{{ post.url }}">{{ post.title }}</a></li>
{% endfor %}


