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
drop database Library

create table Authors id int primary, name varchar 255
create table Books id int primary, title varchar 255, author_id int foreign=Authors.id

drop table Books
drop table Authors

create unique index title on Books (title)
create index name on Authors (name)
```

```
create database Hospital
use Hospital
drop database Hospital

create table Doctors id int primary, name varchar 255, specialty varchar 255, cnp int
create table Patients id int primary, name varchar 255, doctor_id int foreign=Doctors.id
create table Appointments patient_id int primary foreign=Patients.id, doctor_id int primary foreign=Doctors.id

drop table Appointments
drop table Patients
drop table Doctors

create unique index cnp on Patients (cnp)
create index name on Patients (name)
create index specialty on Doctors (specialty)
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
drop database School

create table Teachers id int primary, name varchar 255, specialty varchar 255
create table Students id int primary, name varchar 255, cnp int, teacher_id int foreign=Teachers.id
create table School_Teachers teacher_id int primary foreign=Teachers.id, student_id int primary foreign=Students.id, name varchar 255
create table Grades id int primary, grade int
create table Students_Grades student_id int primary foreign=Students.id, grade_id int primary foreign=Grades.id

drop table Students_Grades
drop table Grades
drop table School_Teachers
drop table Students
drop table Teachers

create index name on Students (name)
create unique index cnp on Students (cnp)
create index name on Teachers (name)
create unique index specialty on Teachers (specialty)
create index grade on Grades (grade)
```

```
insert into Teachers (id, name, specialty) values (1, 'John', 'Math')
insert into Students (id, name, cnp, teacher_id) values (1, 'Alice', 123, 1)
insert into School_Teachers (teacher_id, student_id, name) values (1, 1, 'UBB')
insert into Grades (id, grade) values (1, 10)
insert into Students_Grades (student_id, grade_id) values (1, 1)
```

```
delete from Teachers where id = 1
delete from School_Teachers where teacher_id = 2 and student_id = 1
```

```
db.getCollection('School_Teachers').getIndexes()
db.getCollection('School_Students').getIndexes()
db.getCollection('School_Teachers_idx_specialty.ind').getIndexes()
db.getCollection('School_Teachers_idx_name.ind').getIndexes()
db.getCollection('School_Students_idx_cnp.ind').getIndexes()
db.getCollection('School_Students_idx_name.ind').getIndexes()
```

```
db.School_Teachers.find()
db.School_Students.find()
db.School_School_Teachers.find()
db.School_Grades.find()
db.School_Students_Grades.find()
```