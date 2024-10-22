# miniDBMS
=======
### Start MongoDB:
```bash
brew services start mongodb/brew/mongodb-community
```

This will start MongoDB as a background service, so it will continue running even after you close the terminal.

### To stop MongoDB:
```bash
brew services stop mongodb/brew/mongodb-community
```

If you want to run MongoDB without starting it as a background service, you can run it manually:

```bash
mongod --config /usr/local/etc/mongod.conf --fork
```

This will start MongoDB manually, and it will run until you close the terminal or stop it.

Create Company Database:
```bash
create database Company
use Company
create table Departments id int primary notnull, name varchar 255
create table Employees id int primary notnull, name varchar 255, cnp int, department_id int foreign=Departments.id
drop table Employees
drop table Departments
createindex unique idx_cnp Employees cnp
drop database Company
```
