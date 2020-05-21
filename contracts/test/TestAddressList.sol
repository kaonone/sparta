pragma solidity ^0.5.12;

import "../utils/AddressList.sol";

contract TestAddressList {
    using AddressList for AddressList.Data;

    AddressList.Data _data;

    function append(address _item) public {
        _data.append(_item);
    }

    function append(address _item, address _to) public {
        _data.append(_item, _to);
    }

    function prepend(address _item) public {
        _data.prepend(_item);
    }

    function prepend(address _item, address _to) public {
        _data.prepend(_item, _to);
    }

    function remove(address _item) public {
        _data.remove(_item);
    }

    function replace(address _from, address _to) public {
        _data.replace(_from, _to);
    }

    function swap(address _a, address _b) public {
        _data.swap(_a, _b);
    }

    function first()  public view returns (address) { 
        return _data.first();
    }

    function last()  public view returns (address) { 
        return _data.last();
    }

    function contains(address _item)  public view returns (bool) { 
        return  _data.contains(_item);
    }

    function next(address _item)  public view returns (address) { 
        return _data.next(_item);
    }

    function prev(address _item) public view returns (address) { 
        return _data.prev(_item);
    }




}