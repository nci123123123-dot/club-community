-- Rename nationality code US → EN (English-speaking)
update users     set nationality        = 'EN' where nationality        = 'US';
update posts     set author_nationality = 'EN' where author_nationality = 'US';
update comments  set author_nationality = 'EN' where author_nationality = 'US';
update poll_votes set nationality       = 'EN' where nationality        = 'US';
