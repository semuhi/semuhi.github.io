---
title: ""
permalink: "/research/"
layout: default
---

{% for post in site.categories.research %}
 <li><span>{{ post.date | date_to_string }}</span> &nbsp; <a href="{{ post.url }}">{{ post.title }}</a></li>
{% endfor %}
