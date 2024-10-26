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
create table Authors id int primary, name varchar 255
create table Books id int primary, title varchar 255, author_id int foreign=Authors.id
drop table Books
drop table Authors
createindex unique Books title
createindex Authors name
drop database Library
```

```
create database Hospital
use Hospital
create table Doctors id int primary, name varchar 255, specialty varchar 255, cnp int
create table Patients id int primary, name varchar 255, doctor_id int foreign=Doctors.id
create table Appointments patient_id int primary foreign=Patients.id, doctor_id int primary foreign=Doctors.id
drop table Appointments
drop table Patients
drop table Doctors
createindex unique Patients cnp
createindex Patients name
createindex Doctors specialty
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
db.getCollection('Library_Books_idx_title.ind').getIndexes()
```

### Fast example
```
create database School
use School
create table Teachers id int primary, name varchar 255, specialty varchar 255
create table Students id int primary, name varchar 255, cnp int, teacher_id int foreign=Teachers.id
create table School_Teachers teacher_id int primary foreign=Teachers.id, student_id int primary foreign=Students.id
drop table School_Teachers
drop table Students
drop table Teachers
createindex unique Students cnp
createindex Students name
createindex Teachers name
createindex unique Teachers specialty
drop database School
```

```
db.getCollection('School_Teachers').getIndexes()
db.getCollection('School_Students_idx_cnp.ind').getIndexes()
db.getCollection('School_Students_idx_name.ind').getIndexes()
```