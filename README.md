# Spletka - Web platform for Beauty Service providers 
This is a preproduction build of a Angular+Node Docker containerized multitenant platform app for beauty service appointment booking.

# Features
* Fully Web-based - no download required
* No register/login required - creating an appointment is not walled behind a sign-up process (email+phone only)
* Local-state driven - remembers user's email/phone input, language preference, previous searches, and last open studio/service page
* Easy provider setup wizard - Intuitive and step based, only the essentials, easy to modify in the future
* Email & SMS reminder notifications - Integrated Brevo for avoiding missed appointments through optional 48h, 24h, 2h notifications
* Balkan i18n integrated - full language integration for Balkan languages
* Leaflet Map - finding at home service providers without a map is a tedious task, so 'address' and 'lon/lat' location specification is available for providers. 
* Cache and Index optimized

# Context
This was a startup idea, small project made in 2025 to capitalize on the increasing presence of at-home beauty service providers paying for booking mobile applications in Serbia (make-up artists, nail technicians, hair salons, ..). Eventually hosted on Hetzner's VPS, with server hardening, bot detection, scrapping, Prometheus, Grafana, .. all configured and running.
