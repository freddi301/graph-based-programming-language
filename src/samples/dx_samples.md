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
Successive : (previous: Natural) => Natural
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

## Navigation

In every preceeding example, navigate to every part end remove. (with arrows, left right for siblings, up down for deepness)

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

and(True, True) = True
and(_, _) = False

or(False, False) = False
or(_, _) = True

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

# Editing experiences to implement

- tree editor with mouse
- keyboard text like experience

# Contextual text editing commands

- is (create term in place and let set annotation)
- done (goes to initial editing state)
- given (create term in place and let add parameters)
- and (after given, let add another parameter)
- where (create term in place and let add binding)
- and (after where, let add another binding)
- returns (create lambda term in place and let set reference)
- gives (create pi term in place and let set reference)
- up arrow (goes up in the hierarchy)
- down arroa (goes down in the hierarchy)
- arrow left/right (goes to sibling in hierarchy)

# TODO

- pattern matching
- interface/implementation pair
- datatype/instance pair
- anonymous record, tuple
- unwrap operator
