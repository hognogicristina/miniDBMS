# miniDBMS
### Start MongoDB:

```
brew services start mongodb/brew/mongodb-community
```

This will start MongoDB as a background service, so it will continue running even after you close the terminal.

### To stop MongoDB:

```
brew services stop mongodb/brew/mongodb-community
```

If you want to run MongoDB without starting it as a background service, you can run it manually:

```
mongod --config /usr/local/etc/mongod.conf --fork
```

This will start MongoDB manually, and it will run until you close the terminal or stop it.

### Database creation examples

```
create database Library
use Library
create table Authors id int primary notnull, name varchar 255
create table Books id int primary notnull, title varchar 255, author_id int foreign=Authors.id
drop table Books
drop table Authors
createindex unique idx_title Books title
createindex idx_name Authors name
drop database Library
```

```
create database Hospital
use Hospital
create table Doctors id int primary notnull, name varchar 255, specialty varchar 255, cnp int
create table Patients id int primary notnull, name varchar 255, doctor_id int foreign=Doctors.id
drop table Patients
drop table Doctors
createindex unique idx_cnp Patients cnp
createindex idx_specialty Doctors specialty
drop database Hospital
```

### Use Mongo with CLI

1. Start MongoDB

```
mongosh
```

2. Show databases

```
show dbs
```

3. Use a database

```
use Library
```

4. Show database's collections

```
show collections
```

5Show index/table collection of indexes

```
db.getCollection('Library_Authors').getIndexes()
db.getCollection('idx_title.ind').getIndexes()
```