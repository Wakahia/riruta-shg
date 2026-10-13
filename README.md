# St. John the Baptist Self Help Group, Riruta: website

Run it on your computer:

    npm install
    node create-admin.js admin "Choose a long password here"
    node server.js

Then open http://localhost:3000 and http://localhost:3000/admin

- Change phone, loans, FAQs and other wording in `config.js`.
- Back up the `data/` folder (database) and `public/uploads/` (pictures) regularly.
- Copy `.env.example` to `.env` and set SESSION_SECRET before putting the site online.
