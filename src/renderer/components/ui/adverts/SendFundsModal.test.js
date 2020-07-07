/* eslint import/first: 0 */
import React from 'react'
import { shallow } from 'enzyme'
import BigNumber from 'bignumber.js'

import { SendFundsModal } from './SendFundsModal'
import { mockClasses } from '../../../../shared/testing/mocks'

describe('SendFundsModal', () => {
  it('renders component SendFundsModal', () => {
    const result = shallow(
      <SendFundsModal
        classes={mockClasses}
        balanceZec={new BigNumber(0.7)}
        rateUsd={new BigNumber(0.7)}
        rateZec={1}
        handleClose={jest.fn()}
        handleSend={jest.fn()}
        setFieldValue={jest.fn()}
        clearCurrentOpenTab={jest.fn()}
        openAddFundsTab={jest.fn()}
        openSettingsModal={jest.fn()}
        validateForm={jest.fn()}
        open
        isValid
        values={{}}
        touched={{}}
        errors={{}}
        submitForm={jest.fn()}
        lockedBalance={BigNumber(0.1)}
        shippingData={{
          street: 'test',
          country: 'test',
          region: '',
          postalCode: '21',
          city: 'San Francisco',
          address: 'test street'
        }}
      />
    )
    expect(result).toMatchSnapshot()
  })
})
