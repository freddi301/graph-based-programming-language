## Boolean basics

```
Boolean : Type
True : Boolean
False : Boolean

not = (x) => match x { True = False; False = True; }
and = (x, y) => match { (x = True) = y; (x = False) = False; }
```

## Boolean definition

```
boolean : type
true : boolean
false : boolean
```

## Church Boolean

```
true = (onTrue, onFalse) => onTrue
false = (onTrue, onFalse) => onFalse
not = (p) => p(onTrue = false, onFalse = true)
and = (p, q) => p(onTrue = q, onFalse = false)
or = (p, q) => p(onTrue = true, onFalse = q)
```

## Church list definition

```
nil = (onNil, onCons) => onNil
cons = (head, tail) => (onNil, onCons) => onCons(head = head, tail = tail)
map = (list, mapper) => list(onNil = nil, onCons = (head, tail) => cons(head = mapper(item = head), tail = map(list = tail, mapper = mapper)))
```

## Natural defintion

```
Natural : Type
Zero : Natural
Successive : (previous: Natural) -> Natural
```

## Vector definition

```
Vector : (item, length: Natural) -> Type
Nil : (item: Type) -> Vector(item = Item, length = Zero)
Cons : (item: Type, head: item, tail: Vector(item = item, length = tailLenght)) -> Vector(length = Succ(tailLength))
```

## Functor definition

```
FunctorInterface : (functor: (value: Type) -> Type) -> Type
FunctorImplementation : (map: (fromItem : Type, toItem : Type, mapper: (item: fromItem) -> toItem, fromContainer: functor(item = fromItem)) -> toItem) -> FunctorInterface(functor = functor)
```

## Functor brief definition

```
interface Functor : (f) -> Type
  map : (a -> b, f(a)) -> f(b)
```

## Booleans with pattern matching

```
Boolean : Type
True : Boolean
False : Boolean

not(True) = false
not(False) = true

and(True, y) = y
and(False, y) = False

or(True, y) = True
or(False, y) = y

xor(True, True) = False
xor(True, False) = True
xor(False, True) = True
xor(False, False) = False

nand(x, y) = not(and(x, y))

nor(x, y) = not(or(x, y))

DeMorgan1 : Equality(not(and(a, b)), or(not(a), not(b))) = ???
DeMorgan2 : Equality(not(or(a, b)), and(not(a), not(b))) = ???
AndIsCommutative : Equality(and(a, b), and(b, a)) = ???
OrIsCommutative : Equality(or(a, b), or(b, a)) = ???
XorIsCommutative : Equality(xor(a, b), xor(b, a)) = ???
```

## Naturals with pattern matching

```
Natural : Type
Zero : Natural
Successive : (previous: Natural) -> Natural

add(Zero, y) = y
add(Successive(x), y) = add(x, Successive(y))
```

## Examaple applications

- notebook for boolean calculus

- todo list ui
